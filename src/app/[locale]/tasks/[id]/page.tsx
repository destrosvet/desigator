import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canViewTask } from "@/lib/authorization";
import { db } from "@/lib/db";
import { TaskDetailClient } from "./task-detail-client";

export default async function TaskDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/login`);
  if (!(await canViewTask(session.user, id))) notFound();

  const task = await db.task.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, class: { select: { name: true } } } },
      criteria: { orderBy: { order: "asc" } },
      submissions: {
        where: session.user.role === "STUDENT" ? { studentId: session.user.id } : undefined,
        include: {
          student: { select: { id: true, name: true, email: true } },
          attachments: { select: { id: true, originalName: true, size: true, s3Url: true } },
          evaluations: { include: { evaluator: { select: { name: true } } } },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!task) notFound();

  const evaluators = session.user.role === "STUDENT" ? [] : await db.user.findMany({
    where: { role: { in: ["TEACHER", "EVALUATOR"] }, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <TaskDetailClient
      locale={locale}
      role={session.user.role}
      task={JSON.parse(JSON.stringify(task))}
      evaluators={evaluators}
    />
  );
}