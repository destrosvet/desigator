import { MODEL_MIME_TYPE, normalizeModelFile, validateGlb } from "@/lib/model-files";
import { importFingerprint } from "@/lib/import-fingerprint";
import { uploadFileSizeLimit } from "@/lib/media";
import { createSubmissionVersion } from "@/lib/submission-versions";
import { z } from "zod";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageTask } from "@/lib/authorization";
import { db } from "@/lib/db";
import { deleteFile, uploadFile } from "@/lib/s3";

const MAX_FILES = 20;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([MODEL_MIME_TYPE, "video/mp4", "video/webm", "application/pdf", "application/zip", "image/jpeg", "image/png", "image/webp", "image/gif"]);

interface BulkUploadResult {
  filename: string;
  status: "success" | "student_not_found" | "error";
  studentName?: string;
  externalId?: string;
  message?: string;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "Vyberte zadání." }, { status: 400 });
  if (!(await canManageTask(session.user, taskId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const task = await db.task.findUnique({ where: { id: taskId }, select: { subject: { select: { year: true, name: true, class: { select: { name: true, students: { select: { student: { select: { id: true, name: true, externalId: true } } } } } } } } } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const existing = await db.submission.findMany({ where: { taskId }, select: { studentId: true } });
  return NextResponse.json({ subject: task.subject.name, year: task.subject.year, className: task.subject.class.name, students: task.subject.class.students.map(({ student }) => ({ ...student, hasSubmission: existing.some((work) => work.studentId === student.id) })) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const taskId = formData.get("taskId");
    const files = formData.getAll("files").filter((value): value is File => value instanceof File).map(normalizeModelFile);

    if (typeof taskId !== "string" || !taskId) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    if (!(await canManageTask(session.user, taskId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (files.length === 0 || files.length > MAX_FILES) return NextResponse.json({ error: `Upload must contain 1-${MAX_FILES} files` }, { status: 400 });
    if (files.some((file) => file.size > uploadFileSizeLimit(file.type))) return NextResponse.json({ error: "Soubor překračuje limit: MP4 100 MB, ostatní formáty 25 MB." }, { status: 413 });
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) return NextResponse.json({ error: "Upload exceeds the 100 MB total limit" }, { status: 413 });
    if (files.some((file) => !ALLOWED_MIME_TYPES.has(file.type) || !/[.](jpe?g|png|webp|gif|pdf|zip|mp4|webm|glb)$/i.test(file.name))) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

  for (const file of files.filter((item) => item.type === MODEL_MIME_TYPE)) {
    const error = validateGlb(new Uint8Array(await file.arrayBuffer()));
    if (error) return NextResponse.json({ error }, { status: 400 });
  }

    const task = await db.task.findUnique({ where: { id: taskId }, select: { subject: { select: { classId: true } } } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const classStudents = await db.classStudent.findMany({ where: { classId: task.subject.classId }, select: { student: { select: { id: true, name: true, externalId: true } } } });
    const stage = z.enum(["WIP", "FINAL"]).safeParse(formData.get("stage") || "FINAL");
    const changeNote = z.string().max(2000).safeParse(formData.get("changeNote") || "");
    if (!stage.success || !changeNote.success) return NextResponse.json({ error: "Neplatný stav nebo popis verze." }, { status: 400 });
    const parsed = z.array(z.string().min(1)).safeParse((() => { try { return JSON.parse(String(formData.get("studentIds"))); } catch { return null; } })());
    if (formData.get("confirmed") !== "true" || !parsed.success || parsed.data.length !== files.length) {
      return NextResponse.json({ error: "Potvrďte autora každého souboru před importem." }, { status: 400 });
    }
    const students = parsed.data.map((id) => classStudents.find(({ student }) => student.id === id)?.student);
    if (students.some((student) => !student)) return NextResponse.json({ error: "Žák nepatří do třídy zadání." }, { status: 400 });
    const signatures = files.map((file, index) => JSON.stringify([parsed.data[index], file.name, file.size]));
    if (new Set(signatures).size !== files.length) return NextResponse.json({ error: "Dávka obsahuje duplicitní soubor pro stejného žáka." }, { status: 400 });
    const fingerprint = await importFingerprint(stage.data, files, parsed.data);
    const importKey = { taskId_fingerprint: { taskId, fingerprint } };
    const replay = await db.bulkSubmissionImport.findUnique({ where: importKey });
    if (replay) return NextResponse.json({ ...(replay.result as object), replayed: true });
    const results: BulkUploadResult[] = files.map((file, index) => ({ filename: file.name, status: "success", externalId: students[index]!.externalId || undefined, studentName: students[index]!.name }));
    const result = { results, summary: { total: files.length, success: files.length, notFound: 0, errors: 0 } };
    const uploaded: Array<{ id: string; key: string; file: File; studentId: string }> = [];
    try {
      for (const [index, file] of files.entries()) {
        const id = randomUUID();
        const key = "submissions/" + taskId + "/" + students[index]!.id + "/" + id + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        await uploadFile(key, Buffer.from(await file.arrayBuffer()), file.type);
        uploaded.push({ id, key, file, studentId: students[index]!.id });
      }
      const replayed = await db.$transaction(async (tx) => {
        // Serialize batches of the same task; the second request sees the committed receipt.
        await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${taskId} FOR UPDATE`;
        if (await tx.bulkSubmissionImport.findUnique({ where: importKey })) return true;
        for (const studentId of new Set(parsed.data)) {
          const submission = await createSubmissionVersion(tx, { taskId, studentId, uploadedById: session.user.id, stage: stage.data, changeNote: changeNote.data || null });
          await tx.attachment.createMany({ data: uploaded.filter((item) => item.studentId === studentId).map(({ id, key, file }) => ({ id, filename: file.name.replace(/[^a-zA-Z0-9._-]/g, "_"), originalName: file.name, mimeType: file.type, size: file.size, s3Key: key, s3Url: "/api/uploads/" + id, submissionId: submission.id })) });
        }
        await tx.bulkSubmissionImport.create({ data: { taskId, fingerprint, result: JSON.parse(JSON.stringify(result)) } });
        return false;
      });
      if (replayed) await Promise.all(uploaded.map(({ key }) => deleteFile(key).catch(() => undefined)));
      return NextResponse.json({ ...result, replayed });
    } catch {
      await Promise.all(uploaded.map(({ key }) => deleteFile(key).catch(() => undefined)));
      return NextResponse.json({ error: "Import selhal. Žádná odevzdání z této dávky nebyla uložena. Zkuste dávku znovu." }, { status: 500 });
    }


  } catch {
    return NextResponse.json({ error: "Bulk upload failed" }, { status: 500 });
  }
}
