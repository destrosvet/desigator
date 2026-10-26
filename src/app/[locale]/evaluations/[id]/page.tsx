import { canEvaluate, isAdmin } from "@/lib/permissions";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EvaluationDetailClient } from "./evaluation-detail-client";
import { evaluationScope } from "@/lib/evaluations";

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
          student: { select: { name: true, email: true } },
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true }, orderBy: { uploadedAt: "asc" as const } },
          task: { include: { criteria: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!evaluation) notFound();

  const queue = await db.evaluation.findMany({
    where: { AND: [evaluationScope(session.user), { evaluatorId: evaluation.evaluatorId, submission: { taskId: evaluation.submission.taskId } }] },
    select: { id: true, status: true, totalPoints: true, submission: { select: { student: { select: { name: true } } } } },
    orderBy: [{ submission: { student: { name: "asc" } } }, { id: "asc" }],
  });

  return <EvaluationDetailClient key={evaluation.id} evaluation={JSON.parse(JSON.stringify(evaluation))} queue={queue} canEdit={isAdmin(session.user) || (canEvaluate(session.user) && evaluation.evaluatorId === session.user.id)} />;
}
