import { anonymousEvaluation, canEvaluate, canTeach } from "@/lib/permissions";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canManageEvaluation } from "@/lib/authorization";
import { db } from "@/lib/db";
import { EvaluationDetailClient } from "./evaluation-detail-client";
import { evaluationQuerySchema, evaluationWhere, evaluationScope, shuffleReviewOrder } from "@/lib/evaluations";
import { anonymousAttachmentName } from "@/lib/media";
import { reviewFilterQuery } from "@/lib/review-filters";

export default async function EvaluationDetailPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/login`);

  const where = { AND: [{ id }, evaluationScope(session.user)] };

  const evaluation = await db.evaluation.findFirst({
    where,
    include: {
      evaluator: { select: { name: true } },
      scores: true,
      submission: {
        include: {
          student: { select: { name: true, email: true } },
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true }, orderBy: { uploadedAt: "asc" as const } },
          task: { include: { criteria: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!evaluation) notFound();

  const raw = await searchParams;
  const fromGrid = raw.from === "grid";
  const parsed = evaluationQuerySchema.safeParse(Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === "string" && value !== "")));
  if (fromGrid && !parsed.success) notFound();
  const filters = fromGrid && parsed.success ? parsed.data : undefined;
  const query = filters ? reviewFilterQuery(filters) : "";
  const gridHref = `/${locale}/evaluations?${query || new URLSearchParams({ taskId: evaluation.submission.taskId })}`;
  const navigationQuery = filters ? "?from=grid&" + query : "";

  const queue = await db.evaluation.findMany({
    where: filters ? evaluationWhere(session.user, filters) : { AND: [evaluationScope(session.user), { evaluatorId: evaluation.evaluatorId, submission: { taskId: evaluation.submission.taskId } }] },
    select: { id: true, evaluatorId: true, status: true, totalPoints: true, submission: { select: { taskId: true, student: { select: { name: true } } } } },
    orderBy: filters ? [{ createdAt: "desc" }, { id: "desc" }] : [{ submission: { student: { name: "asc" } } }, { id: "asc" }],
  });

  // Keep the open work usable when saving changes its status outside the active filter.
  if (!queue.some(item => item.id === evaluation.id)) queue.unshift({ id: evaluation.id, evaluatorId: evaluation.evaluatorId, status: evaluation.status, totalPoints: evaluation.totalPoints, submission: { taskId: evaluation.submission.taskId, student: { name: evaluation.submission.student.name } } });
  const ownQueue = canEvaluate(session.user) ? queue.filter(item => item.evaluatorId === session.user.id) : [];
  const scoreTasks = Object.fromEntries(ownQueue.map(item => [item.id, item.submission.taskId]));
  const taskIds = [...new Set(Object.values(scoreTasks))];
  const completedOutsideQueue = taskIds.length ? await db.evaluation.findMany({
    where: { evaluatorId: session.user.id, status: "COMPLETED", totalPoints: { not: null }, submission: { taskId: { in: taskIds } } },
    select: { id: true, totalPoints: true, submission: { select: { taskId: true } } },
  }) : [];
  const savedScores: Record<string, number[]> = {};
  for (const item of completedOutsideQueue) {
    if (scoreTasks[item.id] === undefined && item.totalPoints !== null) {
      (savedScores[item.submission.taskId] ??= []).push(item.totalPoints);
    }
  }
  const anonymous = anonymousEvaluation(session.user);
  const visibleEvaluation = anonymous ? { ...evaluation, submission: { ...evaluation.submission, student: undefined, attachments: evaluation.submission.attachments.map((file, index) => ({ ...file, originalName: anonymousAttachmentName(file.originalName, index) })) } } : evaluation;
  const orderedQueue = filters && (canEvaluate(session.user) || canTeach(session.user)) ? shuffleReviewOrder(queue, session.user.id) : queue;
  const visibleQueue = orderedQueue.map(({ id, status, totalPoints, submission }) => ({ id, status, totalPoints, ...(anonymous ? {} : { submission: { student: submission.student } }) }));
  return <EvaluationDetailClient key={evaluation.id} evaluation={JSON.parse(JSON.stringify(visibleEvaluation))} queue={visibleQueue} scoreTasks={scoreTasks} savedScores={savedScores} gridHref={gridHref} navigationQuery={navigationQuery} statusFilter={filters?.status} canEdit={await canManageEvaluation(session.user, id)} />;
}
