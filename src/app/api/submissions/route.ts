import { MODEL_MIME_TYPE, normalizeModelFile, validateGlb } from "@/lib/model-files";
import { uploadFileSizeLimit } from "@/lib/media";
import { z } from "zod";
import { createSubmissionVersion } from "@/lib/submission-versions";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile, uploadFile } from "@/lib/s3";

const MAX_FILES = 5;
const ALLOWED_MIME_TYPES = new Set([MODEL_MIME_TYPE, "video/mp4", "video/webm", "application/pdf", "application/zip", "image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const taskId = formData.get("taskId");
  const content = formData.get("content");
  const stage = z.enum(["WIP", "FINAL"]).safeParse(formData.get("stage") || "FINAL");
  const changeNote = z.string().max(2000).safeParse(formData.get("changeNote") || "");
  if (!stage.success || !changeNote.success) return NextResponse.json({ error: "Neplatný stav nebo popis verze." }, { status: 400 });
  const files = formData.getAll("files").filter((value): value is File => value instanceof File).map(normalizeModelFile);

  if (typeof taskId !== "string" || !taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }
  if (files.length > MAX_FILES || files.some((file) => file.size > uploadFileSizeLimit(file.type))) {
    return NextResponse.json({ error: "Upload limits exceeded" }, { status: 413 });
  }
  if (files.some((file) => !ALLOWED_MIME_TYPES.has(file.type))) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  if ((!content || typeof content !== "string" || !content.trim()) && files.length === 0) {
    return NextResponse.json({ error: "Submission cannot be empty" }, { status: 400 });
  }

  for (const file of files.filter((item) => item.type === MODEL_MIME_TYPE)) {
    const error = validateGlb(new Uint8Array(await file.arrayBuffer()));
    if (error) return NextResponse.json({ error }, { status: 400 });
  }

  const task = await db.task.findFirst({
    where: {
      id: taskId,
      status: "PUBLISHED",
      subject: { classes: { some: { class: { organizationId: session.user.organizationId || "__no_organization__", students: { some: { studentId: session.user.id } } } } } },
    },
    select: { id: true, deadline: true },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.deadline && task.deadline < new Date()) {
    return NextResponse.json({ error: "Deadline has passed" }, { status: 409 });
  }

  const uploaded: Array<{ id: string; key: string; file: File; filename: string }> = [];
  try {
    for (const file of files) {
      const id = randomUUID();
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `submissions/${taskId}/${session.user.id}/${id}-${filename}`;
      await uploadFile(key, Buffer.from(await file.arrayBuffer()), file.type);
      uploaded.push({ id, key, file, filename });
    }

    const submission = await db.$transaction(async (tx) => {
      const saved = await createSubmissionVersion(tx, {
        taskId, studentId: session.user.id, uploadedById: session.user.id,
        content: typeof content === "string" ? content.trim() || null : null,
        stage: stage.data, changeNote: changeNote.data || null,
      });

      if (uploaded.length) {
        await tx.attachment.createMany({
          data: uploaded.map(({ id, key, file, filename }) => ({
            id,
            filename,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            s3Key: key,
            s3Url: `/api/uploads/${id}`,
            submissionId: saved.id,
          })),
        });
      }
      return saved;
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch {
    await Promise.all(uploaded.map(({ key }) => deleteFile(key).catch(() => undefined)));
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
