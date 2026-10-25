import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageTask, canViewTask, type AuthUser } from "@/lib/authorization";
import { consumeRateLimit } from "@/lib/rate-limit";

const headers = { "Cache-Control": "private, no-store" };
const select = { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } } as const;
async function access(user: AuthUser, id: string) {
  const submission = await db.submission.findUnique({ where: { id }, select: { id: true, taskId: true, studentId: true, stage: true } });
  if (!submission) return null;
  const own = submission.studentId === user.id && await canViewTask(user, submission.taskId);
  if (!own && !(await canManageTask(user, submission.taskId))) return null;
  return submission;
}
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { id } = await params;
  try {
    const submission = await access(session.user, id);
    if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
    if (submission.stage !== "WIP") return NextResponse.json({ error: "Consultations are available for WIP versions only" }, { status: 409, headers });
    const cursor = new URL(req.url).searchParams.get("before");
    if (cursor && !(await db.consultationComment.findFirst({ where: { id: cursor, submissionId: id }, select: { id: true } }))) return NextResponse.json({ error: "Invalid cursor" }, { status: 400, headers });
    const rows = await db.consultationComment.findMany({ where: { submissionId: id }, select, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    const page = rows.slice(0, 50);
    return NextResponse.json({ comments: page.reverse(), nextCursor: rows.length > 50 ? rows[49].id : null }, { headers });
  } catch { return NextResponse.json({ error: "Consultation could not be loaded" }, { status: 500, headers }); }
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { id } = await params;
  try {
    const submission = await access(session.user, id);
    if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
    if (submission.stage !== "WIP") return NextResponse.json({ error: "Consultations are available for WIP versions only" }, { status: 409, headers });
    const parsed = z.object({ content: z.string().trim().min(1).max(5000) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Comment must contain 1–5000 characters" }, { status: 400, headers });
    const limit = consumeRateLimit("consultation:" + session.user.id, 30, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "Too many comments" }, { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } });
    const comment = await db.consultationComment.create({ data: { submissionId: id, authorId: session.user.id, content: parsed.data.content }, select });
    return NextResponse.json({ comment }, { status: 201, headers });
  } catch { return NextResponse.json({ error: "Comment could not be saved" }, { status: 500, headers }); }
}
