import { requireUnpublishedResults, PublishedResultsError } from "@/lib/result-publication";
import { managedTaskScope } from "@/lib/authorization";
import { rubricError } from "@/lib/task-validation";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { evaluationQuerySchema, listEvaluations } from "@/lib/evaluations";

const assignmentSchema = z.object({
  submissionId: z.string().min(1),
  evaluatorId: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = evaluationQuerySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid evaluation filters" }, { status: 400 });
  try {
    return NextResponse.json(await listEvaluations(session.user, parsed.data), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
  }
}
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { submissionId, evaluatorId } = assignmentSchema.parse(await req.json());
    const submission = await db.submission.findFirst({
      where: {
        id: submissionId,
        task: managedTaskScope(session.user),
      },
      select: { id: true, stage: true, taskId: true },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    if (submission.stage === "WIP") return NextResponse.json({ error: "Rozpracovaná verze slouží ke konzultaci. K hodnocení vyberte finální verzi." }, { status: 409 });

    const assignedEvaluatorId = evaluatorId || session.user.id;
    const evaluator = await db.user.findFirst({
      where: { id: assignedEvaluatorId, OR: [{ roles: { hasSome: ["ADMIN", "EVALUATOR"] } }, { roles: { isEmpty: true }, role: { in: ["ADMIN", "TEACHER", "EVALUATOR"] } }], isActive: true },
      select: { id: true },
    });
    if (!evaluator) return NextResponse.json({ error: "Evaluator not found" }, { status: 400 });

    const result = await db.$transaction(async (tx) => {
      // Shared task lock serializes rubric changes and evaluator assignment.
      await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${submission.taskId} FOR UPDATE`;
      const task = await tx.task.findUnique({ where: { id: submission.taskId }, include: { criteria: true } });
      const error = task ? rubricError(task.criteria, task.maxPoints, true) : "Zadání nebylo nalezeno.";
      if (error) return { error };
      await requireUnpublishedResults(tx, submissionId);
      const evaluation = await tx.evaluation.upsert({
        where: { submissionId_evaluatorId: { submissionId, evaluatorId: assignedEvaluatorId } },
        update: {}, create: { submissionId, evaluatorId: assignedEvaluatorId },
      });
      const remaining = await tx.evaluation.count({ where: { submissionId, status: { not: "COMPLETED" } } });
      await tx.submission.update({ where: { id: submissionId }, data: { status: remaining ? "UNDER_REVIEW" : "EVALUATED" } });
      return { evaluation };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ evaluation: result.evaluation }, { status: 201 });
  } catch (error) {
    if (error instanceof PublishedResultsError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to assign evaluation" }, { status: 500 });
  }
}
