import { getServerSession } from "next-auth";
import { syncSubjectEvaluations } from "@/lib/subject-evaluators";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { evaluationQuerySchema, evaluationScope, listEvaluations } from "@/lib/evaluations";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { EvaluationGallery } from "@/components/evaluation-gallery";
import { Link } from "@/components/navigation";
import { anonymousEvaluation, canEvaluate, canTeach, isAdmin } from "@/lib/permissions";
import { canManageTask } from "@/lib/authorization";
import { readTaskPublication } from "@/lib/task-result-publication";
import { WithdrawReviewAssignment } from "@/components/withdraw-review-assignment";

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
  const scope = canEvaluate(session.user) || canTeach(session.user) ? { evaluatorId: session.user.id } : evaluationScope(session.user);
  if (isAdmin(session.user)) {
    const [assignments, pending, resultSubjects] = await Promise.all([
      db.subjectEvaluator.findMany({ where: { evaluatorId: session.user.id }, select: { subject: { select: { id: true, name: true } } } }),
      db.subject.findMany({ where: { tasks: { some: { submissions: { some: { evaluations: { some: { evaluatorId: session.user.id } } } } } } }, select: { id: true, name: true } }),
      db.subject.findMany({ where: { isActive: true }, select: { id: true, name: true, year: true }, orderBy: [{ year: "desc" }, { name: "asc" }] }),
    ]);
    const subjects = [...new Map([...assignments.map(item => item.subject), ...pending].map(subject => [subject.id, subject])).values()];
    return <AppShell><div className="space-y-5"><h1 className="text-2xl font-bold">Správa hodnocení</h1><p className="text-sm text-muted-foreground">Vyberte předmět pro přehled výsledků.</p><div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Předmět</th><th className="p-3">Rok</th><th className="p-3">Výsledky</th></tr></thead><tbody>{resultSubjects.map(subject => <tr key={subject.id} className="border-b last:border-0"><td className="p-3">{subject.name}</td><td className="p-3">{subject.year}</td><td className="p-3"><Link href={`/subjects/${subject.id}/results`} className="font-medium underline" aria-label={`Výsledky: ${subject.name}`}>Zobrazit výsledky</Link></td></tr>)}</tbody></table></div>{subjects.length ? <section aria-label="Moje přiřazení k hodnocení" className="space-y-4"><h2 className="text-lg font-semibold">Moje přiřazení k hodnocení</h2>{subjects.map(subject => <div key={subject.id}><h3 className="mb-2 font-medium">{subject.name}</h3><WithdrawReviewAssignment subjectId={subject.id} evaluatorId={session.user.id} /></div>)}</section> : <p className="text-sm text-muted-foreground">Nemáte žádné vlastní přiřazení k hodnocení.</p>}</div></AppShell>;
  }
  await syncSubjectEvaluations(session.user);
  const tasks = await db.task.findMany({
    where: { OR: [{ submissions: { some: { evaluations: { some: scope } } } }, ...(canEvaluate(session.user) ? [{ status: { in: ["PUBLISHED", "CLOSED"] as ("PUBLISHED" | "CLOSED")[] }, subject: { isActive: true, evaluators: { some: { evaluatorId: session.user.id } } } }] : [])] },
    select: { id: true, title: true, subject: { select: { id: true, name: true, year: true, classes: { select: { class: { select: { name: true } } } } } }, submissions: { where: { evaluations: { some: scope } }, select: { evaluations: { where: scope, select: { status: true } } } } },
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
  const breadcrumbs = <><nav aria-label="Drobečková navigace" className="mb-5 flex flex-wrap gap-2 text-sm text-muted-foreground"><Link href="/evaluations" className="hover:underline">Předměty</Link>{subject ? <><span>/</span><Link href={`/evaluations?subjectId=${subject.id}`} className="hover:underline">{subject.name}</Link></> : null}{selectedTask ? <><span>/</span><span className="text-foreground">{selectedTask.title}</span></> : null}</nav>{subject && canEvaluate(session.user) ? <WithdrawReviewAssignment subjectId={subject.id} evaluatorId={session.user.id} /> : null}</>;
  if (selectedTask) {
    const managesSelectedTask = await canManageTask(session.user, selectedTask.id);
    const [result, publication] = await Promise.all([
      listEvaluations(session.user, parsed.data, managesSelectedTask),
      managesSelectedTask ? readTaskPublication(selectedTask.id) : Promise.resolve(undefined),
    ]);
    return <AppShell>{breadcrumbs}<EvaluationGallery key={JSON.stringify(parsed.data)} {...JSON.parse(JSON.stringify(result))} search={parsed.data.search} status={parsed.data.status || ""} taskId={selectedTask.id} publication={publication ?? undefined} studentId={parsed.data.studentId} evaluatorId={parsed.data.evaluatorId} tasks={summaries.filter((task) => task.subject.id === subjectId).map(({ id, title }) => ({ id, title }))} anonymous={anonymousEvaluation(session.user)} showEvaluator={session.user.role !== "EVALUATOR"} /></AppShell>;
  }
  const subjects = [...new Map(summaries.map((task) => [task.subject.id, task.subject])).values()].sort((a, b) => a.name.localeCompare(b.name, "cs"));
  const cards = subject ? summaries.filter((task) => task.subject.id === subject.id).map((task) => ({ id: task.id, title: task.title, detail: "Studentské práce v úkolu", total: task.total, completed: task.completed, href: `/evaluations?taskId=${task.id}` })) : subjects.map((item) => {
    const assignments = summaries.filter((task) => task.subject.id === item.id);
    return { id: item.id, title: item.name, detail: `${item.classes.map((link) => link.class.name).join(", ")} · ${item.year} · ${assignments.length} úkolů`, total: assignments.reduce((sum, task) => sum + task.total, 0), completed: assignments.reduce((sum, task) => sum + task.completed, 0), href: `/evaluations?subjectId=${item.id}` };
  });
  return <AppShell>{breadcrumbs}<div className="space-y-6"><header><h1 className="text-2xl font-bold">{subject ? subject.name : "Předměty k hodnocení"}</h1><p className="mt-2 text-sm text-muted-foreground">{subject ? "Vyberte úkol. Otevře se přehled všech přiřazených studentských prací." : "Vyberte předmět a potom úkol, který chcete hodnotit."}</p></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <Link key={card.id} href={card.href} className="space-y-4 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"><div><h2 className="font-semibold">{card.title}</h2><p className="mt-1 text-sm text-muted-foreground">{card.detail}</p></div><div><div className="mb-2 flex justify-between text-xs"><span>{card.completed} / {card.total} hodnocení dokončeno</span><span>{card.total - card.completed} zbývá</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${card.total ? card.completed / card.total * 100 : 0}%` }} /></div></div></Link>)}</div>{!cards.length ? <p className="rounded-xl border border-dashed p-8 text-muted-foreground">Zatím nemáte přiřazené žádné práce k hodnocení.</p> : null}</div></AppShell>;
}
