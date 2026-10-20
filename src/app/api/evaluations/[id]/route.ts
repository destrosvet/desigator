import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageEvaluation } from "@/lib/authorization";
import { db } from "@/lib/db";

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
  const where = session.user.role === "ADMIN"
    ? { id }
    : session.user.role === "STUDENT"
      ? { id, submission: { studentId: session.user.id } }
      : { id, OR: [{ evaluatorId: session.user.id }, { submission: { task: { creatorId: session.user.id } } }] };

  const evaluation = await db.evaluation.findFirst({
    where,
    include: {
      evaluator: { select: { id: true, name: true } },
      scores: true,
      submission: {
        include: {
          student: { select: { id: true, name: true, email: true } },
          attachments: { select: { id: true, originalName: true, size: true, s3Url: true } },
          task: { include: { criteria: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!evaluation) return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  return NextResponse.json({ evaluation });
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
      include: { submission: { select: { taskId: true } } },
    });
    if (!evaluation) return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });

    const criteria = await db.evaluationCriterion.findMany({
      where: { taskId: evaluation.submission.taskId },
      select: { id: true, maxPoints: true },
    });
    const limits = new Map(criteria.map((criterion) => [criterion.id, criterion.maxPoints]));
    if (input.scores.some((score) => !limits.has(score.criterionId) || score.points > limits.get(score.criterionId)!)) {
      return NextResponse.json({ error: "Invalid criterion score" }, { status: 400 });
    }

    const totalPoints = input.scores.reduce((sum, score) => sum + score.points, 0);
    const updated = await db.$transaction(async (tx) => {
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
      await tx.submission.update({
        where: { id: evaluation.submissionId },
        data: { status: input.status === "COMPLETED" ? "EVALUATED" : "UNDER_REVIEW" },
      });
      return saved;
    });

    return NextResponse.json({ evaluation: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update evaluation" }, { status: 500 });
  }
}