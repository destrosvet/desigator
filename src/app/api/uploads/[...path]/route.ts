import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canReadAttachment } from "@/lib/authorization";
import { db } from "@/lib/db";
import { getFile } from "@/lib/s3";
import { anonymousAttachmentName, PREVIEW_MODEL_TYPES, PREVIEW_DOCUMENT_TYPES, PREVIEW_IMAGE_TYPES, PREVIEW_VIDEO_TYPES } from "@/lib/media";
import { anonymousEvaluation } from "@/lib/permissions";
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
    if ((thumbnail && !PREVIEW_IMAGE_TYPES.has(attachment.mimeType)) || (inline && !PREVIEW_IMAGE_TYPES.has(attachment.mimeType) && !PREVIEW_VIDEO_TYPES.has(attachment.mimeType) && !PREVIEW_DOCUMENT_TYPES.has(attachment.mimeType) && !PREVIEW_MODEL_TYPES.has(attachment.mimeType))) return NextResponse.json({ error: "Preview is not supported for this file type" }, { status: 415 });
    const original = await getFile(attachment.s3Key);
    const buffer = thumbnail ? await sharp(original, { limitInputPixels: 60_000_000 }).rotate().resize(640, 480, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer() : original;
    const range = req.headers.get("range");
    if (inline && (PREVIEW_VIDEO_TYPES.has(attachment.mimeType) || PREVIEW_DOCUMENT_TYPES.has(attachment.mimeType)) && range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, buffer.length - Number(match?.[2]));
      const end = match?.[1] && match[2] ? Math.min(Number(match[2]), buffer.length - 1) : buffer.length - 1;
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start < 0 || start >= buffer.length) return new NextResponse(null, { status: 416, headers: { "Content-Range": "bytes */" + buffer.length, "Cache-Control": "private, no-store" } });
      const part = buffer.subarray(start, end + 1);
      return new NextResponse(part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength) as ArrayBuffer, { status: 206, headers: { "Content-Type": attachment.mimeType, "Content-Length": String(part.length), "Content-Range": "bytes " + start + "-" + end + "/" + buffer.length, "Accept-Ranges": "bytes", "Content-Disposition": "inline", ...(PREVIEW_DOCUMENT_TYPES.has(attachment.mimeType) ? { "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'" } : {}), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    return new NextResponse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer, {
      headers: {
        "Content-Type": thumbnail ? "image/webp" : attachment.mimeType,
        "Content-Length": String(buffer.length),
        ...((PREVIEW_VIDEO_TYPES.has(attachment.mimeType) || PREVIEW_DOCUMENT_TYPES.has(attachment.mimeType)) ? { "Accept-Ranges": "bytes" } : {}),
        ...(inline && PREVIEW_DOCUMENT_TYPES.has(attachment.mimeType) ? { "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'" } : {}),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(anonymousEvaluation(session.user) ? anonymousAttachmentName(attachment.originalName) : attachment.originalName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
