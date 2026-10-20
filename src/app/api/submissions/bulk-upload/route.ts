import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageTask } from "@/lib/authorization";
import { db } from "@/lib/db";
import { deleteFile, uploadFile } from "@/lib/s3";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "application/zip", "image/jpeg", "image/png"]);

interface BulkUploadResult {
  filename: string;
  status: "success" | "student_not_found" | "error";
  studentName?: string;
  externalId?: string;
  message?: string;
}

function extractExternalId(filename: string): string | null {
  const match = filename.match(/^([A-Z0-9]+)[_.-]/i);
  if (match) return match[1].toUpperCase();
  return filename.match(/^([A-Z0-9]+)/i)?.[1].toUpperCase() || null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const taskId = formData.get("taskId");
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (typeof taskId !== "string" || !taskId) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    if (!(await canManageTask(session.user, taskId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (files.length === 0 || files.length > MAX_FILES) return NextResponse.json({ error: `Upload must contain 1-${MAX_FILES} files` }, { status: 400 });
    if (files.some((file) => file.size > MAX_FILE_SIZE)) return NextResponse.json({ error: "A file exceeds the 25 MB limit" }, { status: 413 });
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) return NextResponse.json({ error: "Upload exceeds the 100 MB total limit" }, { status: 413 });
    if (files.some((file) => !ALLOWED_MIME_TYPES.has(file.type))) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

    const task = await db.task.findUnique({ where: { id: taskId }, select: { subject: { select: { classId: true } } } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const classStudents = await db.classStudent.findMany({ where: { classId: task.subject.classId }, include: { student: true } });
    const studentMap = new Map(classStudents.filter(({ student }) => Boolean(student.externalId)).map(({ student }) => [student.externalId!.toUpperCase(), student]));
    const results: BulkUploadResult[] = [];

    for (const file of files) {
      const externalId = extractExternalId(file.name);
      const student = externalId ? studentMap.get(externalId) : undefined;
      if (!externalId || !student) {
        results.push({ filename: file.name, status: externalId ? "student_not_found" : "error", externalId: externalId || undefined, message: externalId ? "Student was not found in this class" : "Student ID is missing in filename" });
        continue;
      }

      const attachmentId = randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `submissions/${taskId}/${student.id}/${attachmentId}-${safeName}`;
      try {
        await uploadFile(key, Buffer.from(await file.arrayBuffer()), file.type);
        try {
          await db.$transaction(async (tx) => {
            const submission = await tx.submission.upsert({
              where: { taskId_studentId: { taskId, studentId: student.id } },
              update: { status: "SUBMITTED", submittedAt: new Date() },
              create: { taskId, studentId: student.id, status: "SUBMITTED" },
            });
            await tx.attachment.create({
              data: { id: attachmentId, filename: safeName, originalName: file.name, mimeType: file.type, size: file.size, s3Key: key, s3Url: `/api/uploads/${attachmentId}`, submissionId: submission.id },
            });
          });
        } catch (error) {
          await deleteFile(key).catch(() => undefined);
          throw error;
        }
        results.push({ filename: file.name, status: "success", externalId, studentName: student.name });
      } catch (error) {
        results.push({ filename: file.name, status: "error", externalId, message: error instanceof Error ? error.message : "Upload failed" });
      }
    }

    return NextResponse.json({
      results,
      summary: {
        total: files.length,
        success: results.filter((result) => result.status === "success").length,
        notFound: results.filter((result) => result.status === "student_not_found").length,
        errors: results.filter((result) => result.status === "error").length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Bulk upload failed" }, { status: 500 });
  }
}