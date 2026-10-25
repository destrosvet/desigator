import { getDashboard } from "@/lib/dashboard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, GraduationCap, BookOpen, ListChecks } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const session = await getServerSession(authOptions);
 if (!session) redirect("/" + locale + "/auth/login");
 const [t, data] = await Promise.all([getTranslations({ locale, namespace: "dashboard" }), getDashboard(session.user)]);
 const titles = data.student ? [t("submittedVersions"), t("availableTasks"), t("publishedResults"), t("stats.totalClasses")] : data.reviewer ? [t("assignedReviews"), t("stats.totalTasks"), t("unfinishedReviews"), t("completedReviews")] : [t("stats.totalStudents"), t("stats.totalTasks"), t("unfinishedReviews"), t("stats.totalClasses")];
 const icons = [Users, ClipboardList, GraduationCap, BookOpen];
 const date = (value: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(value);
 return <AppShell><div className="space-y-6">
  <header><h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1><p className="mt-1 text-muted-foreground">{t("welcome", { name: session.user.name || "" })}</p></header>
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{titles.map((title, index) => { const Icon = icons[index]; return <Card key={title}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{data.counts[index]}</div></CardContent></Card>; })}</div>
  <div className="grid gap-4 lg:grid-cols-2">
   <Card><CardHeader><CardTitle>{t("recentWork")}</CardTitle></CardHeader><CardContent>{!data.recentWorks.length ? <p className="text-sm text-muted-foreground">{t("noWork")}</p> : <ul className="divide-y">{data.recentWorks.map((work) => <li key={work.id} className="flex flex-wrap items-center gap-x-3"><Link href={"/" + locale + "/tasks/" + work.taskId + "/students/" + work.studentId} className="min-w-0 flex-1 rounded px-1 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"><p className="break-words font-medium">{work.task.title}</p><p className="mt-1 text-sm text-muted-foreground">{!data.student ? work.student.name + " · " : ""}v{work.version} · {work.stage === "WIP" ? t("wip") : t("final")}</p><time className="text-xs text-muted-foreground" dateTime={work.submittedAt.toISOString()}>{date(work.submittedAt)}</time></Link>{work.reviewId ? <Button asChild size="sm" className="my-2 shrink-0"><Link href={"/" + locale + "/evaluations/" + work.reviewId}><ListChecks className="size-4" />{t("reviewWork")}</Link></Button> : null}</li>)}</ul>}</CardContent></Card>
   <Card><CardHeader><CardTitle>{t("recentTasks")}</CardTitle></CardHeader><CardContent>{!data.recentTasks.length ? <p className="text-sm text-muted-foreground">{t("noTasks")}</p> : <ul className="divide-y">{data.recentTasks.map((task) => <li key={task.id}><Link href={"/" + locale + "/tasks/" + task.id} className="block rounded px-1 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{task.title}</span><Badge variant="secondary">{t("taskStatus." + task.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{task.subject.name}</p>{task.deadline ? <p className="text-xs text-muted-foreground">{t("deadline")}: <time dateTime={task.deadline.toISOString()}>{date(task.deadline)}</time></p> : null}</Link></li>)}</ul>}</CardContent></Card>
  </div>
 </div></AppShell>;
}
