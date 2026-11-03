import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageSubject } from "@/lib/authorization";
import { db } from "@/lib/db";
import { canEvaluate } from "@/lib/permissions";

const selection = { id: true, name: true, email: true, institution: true } as const;
const eligible = { isActive: true, OR: [{ roles: { hasSome: ["ADMIN" as const, "EVALUATOR" as const] } }, { roles: { isEmpty: true }, role: { in: ["ADMIN" as const, "TEACHER" as const, "EVALUATOR" as const] } }] };
type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageSubject(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [available, assigned] = await Promise.all([
    db.user.findMany({ where: eligible, select: selection, orderBy: { name: "asc" } }),
    db.subjectEvaluator.findMany({ where: { subjectId: id }, select: { evaluator: { select: selection } }, orderBy: { evaluator: { name: "asc" } } }),
  ]);
  return NextResponse.json({ available, assigned: assigned.map(a => a.evaluator) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageSubject(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = z.object({ evaluatorId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Vyberte hodnotitele." }, { status: 400 });
  const evaluator = await db.user.findFirst({ where: { id: body.data.evaluatorId, isActive: true } });
  if (!evaluator || !canEvaluate(evaluator)) return NextResponse.json({ error: "Účet nemá aktivní oprávnění hodnotitele." }, { status: 400 });
  await db.subjectEvaluator.upsert({ where: { subjectId_evaluatorId: { subjectId: id, evaluatorId: evaluator.id } }, update: {}, create: { subjectId: id, evaluatorId: evaluator.id } });
  return NextResponse.json({ success: true });
}
