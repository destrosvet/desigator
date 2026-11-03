import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageSubject } from "@/lib/authorization";
import { db } from "@/lib/db";
import { canEvaluate } from "@/lib/permissions";
import { subjectEvaluatorSelection } from "@/lib/subject-detail";

const selection = subjectEvaluatorSelection;
const eligible = { isActive: true, OR: [{ roles: { hasSome: ["ADMIN" as const, "EVALUATOR" as const] } }, { roles: { isEmpty: true }, role: { in: ["ADMIN" as const, "TEACHER" as const, "EVALUATOR" as const] } }] };
type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageSubject(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const search = new URL(req.url).searchParams.get("search")?.trim() || "";
  if (search.length > 100) return NextResponse.json({ error: "Hledaný text může mít nejvýše 100 znaků." }, { status: 400 });
  const contains = { contains: search, mode: "insensitive" as const };
  const [available, assigned] = await Promise.all([
    search.length < 2 ? Promise.resolve([]) : db.user.findMany({
      where: { AND: [eligible, { evaluatedSubjects: { none: { subjectId: id } } }, { OR: [{ name: contains }, { email: contains }, { institution: contains }, { organization: { name: contains } }] }] },
      select: selection, orderBy: [{ name: "asc" }, { id: "asc" }], take: 21,
    }),
    db.subjectEvaluator.findMany({ where: { subjectId: id }, select: { evaluator: { select: selection } }, orderBy: { evaluator: { name: "asc" } } }),
  ]);
  return NextResponse.json({ available: available.slice(0, 20), hasMore: available.length > 20, assigned: assigned.map(a => a.evaluator) }, { headers: { "Cache-Control": "private, no-store" } });
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
