import { lockedPublicationDate } from "@/lib/result-publication";
import { canEvaluate } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageTask } from "@/lib/authorization";
import { db } from "@/lib/db";
import { rubricError } from "@/lib/task-validation";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
 const session = await getServerSession(authOptions);
 if (!session || !canEvaluate(session.user) || !["ADMIN", "TEACHER"].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 const { id } = await params;
 if (!(await canManageTask(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 try {
  const result = await db.$transaction(async (tx) => {
   await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${id} FOR UPDATE`;
   const task = await tx.task.findUnique({ where: { id }, include: { criteria: true } });
   if (!task) return { error: "Zadání nebylo nalezeno." };
   const error = rubricError(task.criteria, task.maxPoints, true); if (error) return { error };
   const versions = await tx.submission.findMany({ where: { taskId: id }, orderBy: [{ studentId: "asc" }, { version: "desc" }], select: { id: true, studentId: true, stage: true, _count: { select: { attachments: true } } } });
   const seen = new Set<string>();
   const latest = versions.filter((work) => { if (seen.has(work.studentId)) return false; seen.add(work.studentId); return work.stage === "FINAL"; }).sort((a, b) => b._count.attachments - a._count.attachments);
   if (!latest.length) return { error: "Zatím nejsou odevzdané finální práce k hodnocení." };
   const evaluations: Array<{ id: string; status: string }> = [];
   for (const work of latest) {
    if (await lockedPublicationDate(tx, work.id)) continue;
    const evaluation = await tx.evaluation.upsert({ where: { submissionId_evaluatorId: { submissionId: work.id, evaluatorId: session.user.id } }, update: {}, create: { submissionId: work.id, evaluatorId: session.user.id } });
    if (evaluation.status !== "COMPLETED") await tx.submission.update({ where: { id: work.id }, data: { status: "UNDER_REVIEW" } });
    evaluations.push(evaluation);
   }
   if (!evaluations.length) return { error: "Výsledky finálních prací jsou zveřejněné. Pro opravu je nejprve stáhněte ze zveřejnění." };
   return { evaluationId: (evaluations.find((review) => review.status !== "COMPLETED") || evaluations[0]).id, count: evaluations.length };
  }, { timeout: 20000 });
  return "error" in result ? NextResponse.json({ error: result.error }, { status: 409 }) : NextResponse.json(result);
 } catch { return NextResponse.json({ error: "Hodnocení se nepodařilo otevřít. Zkuste to znovu." }, { status: 500 }); }
}
