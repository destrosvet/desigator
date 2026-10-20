import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { evaluationQuerySchema, evaluationScope, listEvaluations } from "@/lib/evaluations";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { EvaluationGallery } from "@/components/evaluation-gallery";
import { Link } from "@/components/navigation";

export default async function EvaluationsPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/login`);
  const raw = await searchParams;
  const normalized = Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === "string" && value !== ""));
  const parsed = evaluationQuerySchema.safeParse(normalized);
  if (!parsed.success) return <AppShell><div role="alert">Neplatné filtry. <Link href="/evaluations">Obnovit přehled</Link></div></AppShell>;
  const scope = evaluationScope(session.user);
  const tasks = await db.task.findMany({
    where: { submissions: { some: { evaluations: { some: scope } } } },
    select: { id: true, title: true, subject: { select: { id: true, name: true, year: true, class: { select: { name: true } } } }, submissions: { where: { evaluations: { some: scope } }, select: { evaluations: { where: scope, select: { status: true } } } } },
    orderBy: { title: "asc" },
  });
  const summaries = tasks.map((task) => {
    const reviews = task.submissions.flatMap((submission) => submission.evaluations);
    return { ...task, total: reviews.length, completed: reviews.filter((review) => review.status === "COMPLETED").length };
  });
  const selectedTask = summaries.find((task) => task.id === parsed.data.taskId);
  const subjectId = selectedTask?.subject.id || parsed.data.subjectId;
  const subject = summaries.find((task) => task.subject.id === subjectId)?.subject;
  if ((parsed.data.taskId && !selectedTask) || (subjectId && !subject)) notFound();
  const breadcrumbs = <nav aria-label="Drobečková navigace" className="mb-5 flex flex-wrap gap-2 text-sm text-muted-foreground"><Link href="/evaluations" className="hover:underline">Předměty</Link>{subject ? <><span>/</span><Link href={`/evaluations?subjectId=${subject.id}`} className="hover:underline">{subject.name}</Link></> : null}{selectedTask ? <><span>/</span><span className="text-foreground">{selectedTask.title}</span></> : null}</nav>;
  if (selectedTask) {
    const result = await listEvaluations(session.user, parsed.data);
    return <AppShell>{breadcrumbs}<EvaluationGallery key={JSON.stringify(parsed.data)} {...JSON.parse(JSON.stringify(result))} search={parsed.data.search} status={parsed.data.status || ""} taskId={selectedTask.id} studentId={parsed.data.studentId} evaluatorId={parsed.data.evaluatorId} tasks={summaries.filter((task) => task.subject.id === subjectId).map(({ id, title }) => ({ id, title }))} showEvaluator={session.user.role !== "EVALUATOR"} /></AppShell>;
  }
  const subjects = [...new Map(summaries.map((task) => [task.subject.id, task.subject])).values()].sort((a, b) => a.name.localeCompare(b.name, "cs"));
  const cards = subject ? summaries.filter((task) => task.subject.id === subject.id).map((task) => ({ id: task.id, title: task.title, detail: "Studentské práce v úkolu", total: task.total, completed: task.completed, href: `/evaluations?taskId=${task.id}` })) : subjects.map((item) => {
    const assignments = summaries.filter((task) => task.subject.id === item.id);
    return { id: item.id, title: item.name, detail: `${item.class.name} · ${item.year} · ${assignments.length} úkolů`, total: assignments.reduce((sum, task) => sum + task.total, 0), completed: assignments.reduce((sum, task) => sum + task.completed, 0), href: `/evaluations?subjectId=${item.id}` };
  });
  return <AppShell>{breadcrumbs}<div className="space-y-6"><header><h1 className="text-2xl font-bold">{subject ? subject.name : "Předměty k hodnocení"}</h1><p className="mt-2 text-sm text-muted-foreground">{subject ? "Vyberte úkol. Otevře se přehled všech přiřazených studentských prací." : "Vyberte předmět a potom úkol, který chcete hodnotit."}</p></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <Link key={card.id} href={card.href} className="space-y-4 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"><div><h2 className="font-semibold">{card.title}</h2><p className="mt-1 text-sm text-muted-foreground">{card.detail}</p></div><div><div className="mb-2 flex justify-between text-xs"><span>{card.completed} / {card.total} hodnocení dokončeno</span><span>{card.total - card.completed} zbývá</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${card.total ? card.completed / card.total * 100 : 0}%` }} /></div></div></Link>)}</div>{!cards.length ? <p className="rounded-xl border border-dashed p-8 text-muted-foreground">Zatím nemáte přiřazené žádné práce k hodnocení.</p> : null}</div></AppShell>;
}
