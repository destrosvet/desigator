import { anonymousEvaluation, canEvaluate, isAdmin } from "@/lib/permissions";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EvaluationDetailClient } from "./evaluation-detail-client";
import { evaluationQuerySchema, evaluationWhere, evaluationScope } from "@/lib/evaluations";
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
    select: { id: true, status: true, totalPoints: true, submission: { select: { student: { select: { name: true } } } } },
    orderBy: filters ? [{ createdAt: "desc" }, { id: "desc" }] : [{ submission: { student: { name: "asc" } } }, { id: "asc" }],
  });

  // Keep the open work usable when saving changes its status outside the active filter.
  if (!queue.some(item => item.id === evaluation.id)) queue.unshift({ id: evaluation.id, status: evaluation.status, totalPoints: evaluation.totalPoints, submission: { student: { name: evaluation.submission.student.name } } });
  const anonymous = anonymousEvaluation(session.user);
  const visibleEvaluation = anonymous ? { ...evaluation, submission: { ...evaluation.submission, student: undefined, attachments: evaluation.submission.attachments.map((file, index) => ({ ...file, originalName: anonymousAttachmentName(file.originalName, index) })) } } : evaluation;
  const visibleQueue = anonymous ? queue.map(({ submission: _submission, ...item }) => item) : queue;
  return <EvaluationDetailClient key={evaluation.id} evaluation={JSON.parse(JSON.stringify(visibleEvaluation))} queue={visibleQueue} gridHref={gridHref} navigationQuery={navigationQuery} statusFilter={filters?.status} canEdit={isAdmin(session.user) || (canEvaluate(session.user) && evaluation.evaluatorId === session.user.id)} />;
}
