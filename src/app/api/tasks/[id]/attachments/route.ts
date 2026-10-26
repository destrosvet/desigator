import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageTask, canViewTask } from "@/lib/authorization";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/s3";
import { uploadFileSizeLimit } from "@/lib/media";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "application/zip", "video/mp4", "video/webm"]);
const select = { id: true, originalName: true, mimeType: true, size: true, uploadedAt: true } as const;
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Context) {
  const session = await getServerSession(authOptions); const { id } = await params;
  if (!session || !(await canViewTask(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const attachments = await db.attachment.findMany({ where: { taskId: id, submissionId: null }, select, orderBy: [{ uploadedAt: "asc" }, { id: "asc" }] });
  return NextResponse.json({ attachments });
}
export async function POST(req: Request, { params }: Context) {
  const session = await getServerSession(authOptions); const { id } = await params;
  if (!session || !(await canManageTask(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uploaded: Array<{ id: string; key: string; file: File; filename: string }> = [];
  try {
    const form = await req.formData();
    const entries = form.getAll("files");
    if (!entries.length || entries.length > 5 || entries.some((item) => !(item instanceof File))) return NextResponse.json({ error: "Vyberte 1 až 5 souborů." }, { status: 400 });
    const files = entries as File[];
    if (files.some((file) => !allowed.has(file.type))) return NextResponse.json({ error: "Nepodporovaný formát souboru." }, { status: 415 });
    if (files.some((file) => !file.size || file.size > uploadFileSizeLimit(file.type)) || files.reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024) return NextResponse.json({ error: "MP4 smí mít nejvýše 100 MB, ostatní soubory 25 MB. Celá dávka může mít nejvýše 100 MB; soubory nesmí být prázdné." }, { status: 413 });
    for (const file of files) {
      const attachmentId = randomUUID(); const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-200) || "file";
      const key = "tasks/" + id + "/" + attachmentId + "-" + filename;
      await uploadFile(key, Buffer.from(await file.arrayBuffer()), file.type);
      uploaded.push({ id: attachmentId, key, file, filename });
    }
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${id} FOR UPDATE`;
      await tx.attachment.createMany({ data: uploaded.map((item) => ({ id: item.id, filename: item.filename, originalName: item.file.name, mimeType: item.file.type, size: item.file.size, s3Key: item.key, s3Url: "/api/uploads/" + item.id, taskId: id })) });
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    await Promise.all(uploaded.map((item) => deleteFile(item.key).catch(() => undefined)));
    return NextResponse.json({ error: "Nahrání příloh selhalo. Zkuste to znovu." }, { status: 500 });
  }
}
export async function DELETE(req: Request, { params }: Context) {
  const session = await getServerSession(authOptions); const { id } = await params;
  if (!session || !(await canManageTask(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = z.object({ ids: z.array(z.string().min(1)).min(1).max(100), confirmed: z.literal(true) }).parse(await req.json());
    const ids = [...new Set(body.ids)];
    const removed = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${id} FOR UPDATE`;
      const files = await tx.attachment.findMany({ where: { id: { in: ids }, taskId: id, submissionId: null }, select: { id: true, s3Key: true } });
      if (files.length !== ids.length) return null;
      await tx.attachment.deleteMany({ where: { id: { in: ids }, taskId: id, submissionId: null } });
      return files;
    });
    if (!removed) return NextResponse.json({ error: "Některá příloha nepatří tomuto zadání. Nic nebylo smazáno." }, { status: 404 });
    // Revoke access in the database first. Storage cleanup cannot restore a removed attachment.
    await Promise.all(removed.map((file) => deleteFile(file.s3Key).catch(() => console.error("Task attachment storage cleanup failed:", file.id))));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Smazání příloh selhalo." }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
