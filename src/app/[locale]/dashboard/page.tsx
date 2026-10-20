import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, GraduationCap, BookOpen } from "lucide-react";

async function getStats(userId: string, role: string) {
  if (role === "ADMIN") {
    const [students, tasks, evaluations, classes] = await Promise.all([
      db.user.count({ where: { role: "STUDENT" } }),
      db.task.count(),
      db.evaluation.count({ where: { status: "PENDING" } }),
      db.class.count(),
    ]);
    return { students, tasks, pendingEvaluations: evaluations, classes };
  }

  if (role === "TEACHER") {
    const [students, tasks, evaluations, classes] = await Promise.all([
      db.classStudent.count({
        where: {
          class: { teacherId: userId },
        },
      }),
      db.task.count({ where: { creatorId: userId } }),
      db.evaluation.count({
        where: {
          submission: {
            task: { creatorId: userId },
          },
          status: "PENDING",
        },
      }),
      db.class.count({ where: { teacherId: userId } }),
    ]);
    return { students, tasks, pendingEvaluations: evaluations, classes };
  }

  if (role === "EVALUATOR") {
    const pending = await db.evaluation.count({
      where: { evaluatorId: userId, status: "PENDING" },
    });
    return { students: 0, tasks: 0, pendingEvaluations: pending, classes: 0 };
  }

  // STUDENT
  const [submissions, classes] = await Promise.all([
    db.submission.count({ where: { studentId: userId } }),
    db.classStudent.count({ where: { studentId: userId } }),
  ]);
  return { students: 0, tasks: submissions, pendingEvaluations: 0, classes };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/${locale}/auth/login`);
  }

  const t = await getTranslations({ locale, namespace: "dashboard" });
  const common = await getTranslations({ locale, namespace: "common" });
  const stats = await getStats(session.user.id, session.user.role);

  const statCards = [
    {
      title: t("stats.totalStudents"),
      value: stats.students,
      icon: Users,
    },
    {
      title: t("stats.totalTasks"),
      value: stats.tasks,
      icon: ClipboardList,
    },
    {
      title: t("stats.pendingEvaluations"),
      value: stats.pendingEvaluations,
      icon: GraduationCap,
    },
    {
      title: t("stats.totalClasses"),
      value: stats.classes,
      icon: BookOpen,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("welcome", { name: session.user.name || "" })}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Aktivita</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Zde se zobrazí grafy a statistiky aktivit.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Nedávné tasky</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Seznam nedávno vytvořených nebo upravených tasků.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
