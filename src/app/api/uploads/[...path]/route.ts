import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canReadAttachment } from "@/lib/authorization";
import { db } from "@/lib/db";
import { getFile } from "@/lib/s3";
import { PREVIEW_IMAGE_TYPES } from "@/lib/media";
import sharp from "sharp";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { path } = await params;
    if (path.length !== 1) return NextResponse.json({ error: "Invalid attachment path" }, { status: 400 });

    const attachment = await db.attachment.findUnique({ where: { id: path[0] } });
    if (!attachment) return NextResponse.json({ error: "File not found" }, { status: 404 });
    if (!(await canReadAttachment(session.user, attachment.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const query = new URL(req.url).searchParams;
    const thumbnail = query.get("thumbnail") === "1";
    const inline = thumbnail || query.get("preview") === "1";
    if (inline && !PREVIEW_IMAGE_TYPES.has(attachment.mimeType)) return NextResponse.json({ error: "Preview is not supported for this file type" }, { status: 415 });
    const original = await getFile(attachment.s3Key);
    const buffer = thumbnail ? await sharp(original, { limitInputPixels: 60_000_000 }).rotate().resize(640, 480, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer() : original;
    return new NextResponse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer, {
      headers: {
        "Content-Type": thumbnail ? "image/webp" : attachment.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
