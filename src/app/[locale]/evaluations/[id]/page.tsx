import { canEvaluate, isAdmin } from "@/lib/permissions";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EvaluationDetailClient } from "./evaluation-detail-client";
import { evaluationScope } from "@/lib/evaluations";
import { anonymousAttachmentName } from "@/lib/media";

export default async function EvaluationDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
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
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true }, orderBy: { uploadedAt: "asc" as const } },
          task: { include: { criteria: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!evaluation) notFound();

  const queue = await db.evaluation.findMany({
    where: { AND: [evaluationScope(session.user), { evaluatorId: evaluation.evaluatorId, submission: { taskId: evaluation.submission.taskId } }] },
    select: { id: true, status: true, totalPoints: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const anonymousEvaluation = { ...evaluation, submission: { ...evaluation.submission, attachments: evaluation.submission.attachments.map((file, index) => ({ ...file, originalName: anonymousAttachmentName(file.originalName, index) })) } };
  return <EvaluationDetailClient key={evaluation.id} evaluation={JSON.parse(JSON.stringify(anonymousEvaluation))} queue={queue} canEdit={isAdmin(session.user) || (canEvaluate(session.user) && evaluation.evaluatorId === session.user.id)} />;
}
