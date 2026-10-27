import { requireUnpublishedResults, PublishedResultsError } from "@/lib/result-publication";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageEvaluation } from "@/lib/authorization";
import { db } from "@/lib/db";
import { evaluationScope } from "@/lib/evaluations";
import { anonymousAttachmentName } from "@/lib/media";
import { anonymousEvaluation } from "@/lib/permissions";

const evaluationSchema = z.object({
  feedback: z.string().max(10000).nullable().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
  scores: z.array(z.object({
    criterionId: z.string(),
    points: z.number().int().min(0),
    comment: z.string().max(2000).nullable().optional(),
  })),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const where = { AND: [{ id }, evaluationScope(session.user)] };

  const evaluation = await db.evaluation.findFirst({
    where,
    include: {
      evaluator: { select: { id: true, name: true } },
      scores: true,
      submission: {
        include: {
          student: { select: { id: true, name: true, email: true } },
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true, s3Url: true } },
          task: { include: { criteria: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!evaluation) return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  const visibleEvaluation = anonymousEvaluation(session.user) ? { ...evaluation, submission: { ...evaluation.submission, student: undefined, attachments: evaluation.submission.attachments.map((file, index) => ({ ...file, originalName: anonymousAttachmentName(file.originalName, index) })) } } : evaluation;
  return NextResponse.json({ evaluation: visibleEvaluation }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canManageEvaluation(session.user, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = evaluationSchema.parse(await req.json());
    const evaluation = await db.evaluation.findUnique({
      where: { id },
      include: { submission: { select: { taskId: true, task: { select: { maxPoints: true } } } } },
    });
    if (!evaluation) return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });

    const criteria = await db.evaluationCriterion.findMany({
      where: { taskId: evaluation.submission.taskId },
      select: { id: true, maxPoints: true },
    });
    const limits = new Map(criteria.map((criterion) => [criterion.id, criterion.maxPoints]));
    const uniqueIds = new Set(input.scores.map((score) => score.criterionId));
    if (uniqueIds.size !== input.scores.length || (input.status === "COMPLETED" && (criteria.length === 0 || uniqueIds.size !== criteria.length))) {
      return NextResponse.json({ error: "Vyplňte každé kritérium právě jednou." }, { status: 400 });
    }
    if (input.scores.some((score) => !limits.has(score.criterionId) || score.points > limits.get(score.criterionId)!)) {
      return NextResponse.json({ error: "Invalid criterion score" }, { status: 400 });
    }

    const totalPoints = input.scores.reduce((sum, score) => sum + score.points, 0);
    if (totalPoints > evaluation.submission.task.maxPoints) return NextResponse.json({ error: "Součet bodů přesahuje maximum zadání." }, { status: 400 });
    const updated = await db.$transaction(async (tx) => {
      await requireUnpublishedResults(tx, evaluation.submissionId);
      await tx.criterionScore.deleteMany({ where: { evaluationId: id } });
      if (input.scores.length) {
        await tx.criterionScore.createMany({
          data: input.scores.map((score) => ({ ...score, evaluationId: id })),
        });
      }
      const saved = await tx.evaluation.update({
        where: { id },
        data: {
          feedback: input.feedback,
          status: input.status,
          totalPoints,
          evaluatedAt: input.status === "COMPLETED" ? new Date() : null,
        },
      });
      const remaining = await tx.evaluation.count({ where: { submissionId: evaluation.submissionId, status: { not: "COMPLETED" } } });
      await tx.submission.update({
        where: { id: evaluation.submissionId },
        data: { status: remaining === 0 ? "EVALUATED" : "UNDER_REVIEW" },
      });
      return saved;
    });

    return NextResponse.json({ evaluation: updated });
  } catch (error) {
    if (error instanceof PublishedResultsError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update evaluation" }, { status: 500 });
  }
}
