import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EvaluationDetailClient } from "./evaluation-detail-client";

export default async function EvaluationDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/login`);

  const where = session.user.role === "ADMIN"
    ? { id }
    : session.user.role === "STUDENT"
      ? { id, submission: { studentId: session.user.id } }
      : { id, OR: [{ evaluatorId: session.user.id }, { submission: { task: { creatorId: session.user.id } } }] };

  const evaluation = await db.evaluation.findFirst({
    where,
    include: {
      evaluator: { select: { name: true } },
      scores: true,
      submission: {
        include: {
          student: { select: { name: true, email: true } },
          attachments: { select: { id: true, originalName: true, s3Url: true } },
          task: { include: { criteria: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!evaluation) notFound();

  return <EvaluationDetailClient evaluation={JSON.parse(JSON.stringify(evaluation))} role={session.user.role} />;
}