import { studentPublishedEvaluations } from "@/lib/result-publication";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canManageTask, canViewTask } from "@/lib/authorization";
import { db } from "@/lib/db";
import { TaskDetailClient } from "./task-detail-client";

export default async function TaskDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/login`);
  if (!(await canViewTask(session.user, id))) notFound();

  const canManage = await canManageTask(session.user, id);
  const task = await db.task.findUnique({
    where: { id },
    include: {
      subject: { select: { classId: true, name: true, class: { select: { name: true } } } },
      criteria: { orderBy: { order: "asc" } },
      submissions: {
        where: session.user.role === "STUDENT" ? { studentId: session.user.id }
          : !canManage ? { evaluations: { some: { evaluatorId: session.user.id } } } : undefined,
        include: {
          student: { select: { id: true, name: true, email: true } },
          attachments: { select: { id: true, originalName: true, size: true, s3Url: true, mimeType: true } },
          evaluations: {
            where: session.user.role === "STUDENT" ? studentPublishedEvaluations : !canManage ? { evaluatorId: session.user.id } : undefined,
            include: { evaluator: { select: { name: true } } },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!task) notFound();

  const students = canManage ? await db.user.findMany({ where: { role: "STUDENT", classMemberships: { some: { classId: task.subject.classId } } }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }) : [];

  return (
    <TaskDetailClient
      canManage={canManage}
      locale={locale}
      role={session.user.role}
      task={JSON.parse(JSON.stringify(task))}
      students={students}
      userId={session.user.id}
    />
  );
}
