import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canReadAttachment } from "@/lib/authorization";
import { db } from "@/lib/db";
import { getFile } from "@/lib/s3";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { path } = await params;
    if (path.length !== 1) return NextResponse.json({ error: "Invalid attachment path" }, { status: 400 });

    const attachment = await db.attachment.findUnique({ where: { id: path[0] } });
    if (!attachment) return NextResponse.json({ error: "File not found" }, { status: 404 });
    if (!(await canReadAttachment(session.user, attachment.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const buffer = await getFile(attachment.s3Key);
    return new NextResponse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename*=UTF-8''''${encodeURIComponent(attachment.originalName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}