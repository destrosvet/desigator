"use client";

import { useTranslations } from "next-intl";
import { ListChecks, Upload } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskAttachments } from "@/components/task-attachments";
import { TaskEditor } from "@/components/task-editor";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { studentWorkRows, type TaskContext, type WorkStudent, type WorkVersion } from "@/lib/task-workflow";

const taskLabels: Record<string, string> = { DRAFT: "Koncept", PUBLISHED: "Publikováno", CLOSED: "Uzavřeno" };
export function TaskDetailClient({ task, students, role, userId, locale, canManage }: { task: TaskContext & { submissions: WorkVersion[] }; students: WorkStudent[]; role: string; userId: string; locale: string; canManage: boolean }) {
 const publication = useTranslations("publication");
 const router = useRouter(); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [messageError, setMessageError] = useState(false); const [currentStatus, setCurrentStatus] = useState(task.status);
 const [search, setSearch] = useState(""); const [page, setPage] = useState(1); const [limit, setLimit] = useState(20); const [submissionFilter, setSubmissionFilter] = useState<"all" | "missing">("all");
 const rows = studentWorkRows(students, task.submissions);
 const isPublished = (work: WorkVersion | null) => Boolean(work && (work.resultsPublishedAt || (task.resultsPublishedAt && work.evaluations.some(review => review.status === "COMPLETED"))));
 const submitted = rows.filter((row) => row.latest).length;
 const filtered = rows.filter((row) => submissionFilter === "all" || !row.latest).filter((row) => (row.name + " " + row.email).toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)));
 const reviewDisabled = busy || (canManage ? !rows.some((row) => row.latest?.stage === "FINAL" && (!row.latest.resultsPublishedAt || task.resultsPublishedAt)) : !task.submissions.some((work) => work.evaluations.length));
 const ownHref = "/" + locale + "/tasks/" + task.id + "/students/" + userId;
 async function updateStatus(status: string) {
  setBusy(true); setMessage(""); setMessageError(false);
  try { const response = await fetch("/api/tasks/" + task.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Změna stavu selhala."); setCurrentStatus(data.task?.status || status); setMessage(status === "PUBLISHED" ? "Zadání bylo publikováno." : status === "CLOSED" ? "Zadání bylo uzavřeno." : "Stav zadání byl změněn."); router.refresh(); }
  catch (reason) { const text = reason instanceof Error ? reason.message : "Změna stavu selhala."; setMessage(text); setMessageError(true); if (/kritéri|bod/i.test(text)) setEditing(true); } finally { setBusy(false); }
 }
 async function startReview() {
  setBusy(true); setMessage("");
  try {
   if (!canManage) {
    const assigned = task.submissions.flatMap((work) => work.evaluations).find((review) => review.status !== "COMPLETED") || task.submissions.flatMap((work) => work.evaluations)[0];
    if (assigned) router.push("/" + locale + "/evaluations/" + assigned.id);
    return;
   }
   const response = await fetch("/api/tasks/" + task.id + "/review-start", { method: "POST" });
   const data = await response.json(); if (!response.ok) throw new Error(data.error);
   router.push("/" + locale + "/evaluations/" + data.evaluationId);
  } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Hodnocení se nepodařilo otevřít."); }
  finally { setBusy(false); }
 }
 return <AppShell><div className="space-y-6">
  <nav aria-label="Drobečková navigace" className="text-sm text-muted-foreground"><a href={"/" + locale + "/tasks"} className="underline">Zadání pro třídy</a><span> / {task.title}</span></nav>
  <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><h1 className="break-words text-3xl font-bold">{task.title}</h1><p className="mt-1 text-muted-foreground">{task.subject.name} · Třída: {task.subject.class.name}</p><Badge variant={currentStatus === "PUBLISHED" ? "success" : currentStatus === "CLOSED" ? "outline" : "secondary"} className="mt-2" title={currentStatus}>{taskLabels[currentStatus] || currentStatus}</Badge></div><div className="flex flex-wrap items-center gap-2" role="group" aria-label="Akce zadání">{canManage ? <Button onClick={() => router.push("/" + locale + "/tasks/bulk-upload?taskId=" + task.id)}><Upload className="size-4" />Hromadně nahrát práce</Button> : null}{role !== "STUDENT" ? <Button variant="outline" disabled={reviewDisabled} onClick={() => void startReview()}><ListChecks className="size-4" />{busy ? "Otevírání…" : "Hodnotit práce"}</Button> : null}{canManage ? <><Button variant="outline" onClick={() => { setMessage(""); setEditing(!editing); }}>{editing ? "Skrýt editor" : "Upravit zadání"}</Button>{currentStatus !== "PUBLISHED" ? <Button variant="outline" disabled={busy} onClick={() => void updateStatus("PUBLISHED")}>{busy ? "Publikování…" : "Publikovat"}</Button> : null}{currentStatus !== "CLOSED" ? <Button variant="outline" disabled={busy} onClick={() => void updateStatus("CLOSED")}>Uzavřít</Button> : null}</> : null}</div></header>
  {message ? <p role={messageError ? "alert" : "status"} className={messageError ? "rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" : "rounded-lg border bg-muted/40 p-3 text-sm"}>{message}</p> : null}
  {canManage && editing ? <TaskEditor task={task} rubricLocked={task.submissions.some((work) => work.evaluations.length > 0)} onClose={() => setEditing(false)} /> : null}
  <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><Card><CardHeader><CardTitle>Co mají studenti odevzdat</CardTitle></CardHeader><CardContent className="space-y-3">{task.description ? <p className="whitespace-pre-wrap">{task.description}</p> : <p className="text-muted-foreground">Popis úkolu zatím není vyplněný.</p>}{task.instructions ? <p className="whitespace-pre-wrap">{task.instructions}</p> : null}<p className="text-sm">Termín: {task.deadline ? new Date(task.deadline).toLocaleString(locale) : "Bez termínu"}</p></CardContent></Card><Card><CardHeader><CardTitle>Hodnoticí kritéria</CardTitle></CardHeader><CardContent className="space-y-3">{task.criteria.map((criterion) => <div key={criterion.id} className="flex justify-between gap-3 border-b pb-2"><div><p>{criterion.name}</p>{criterion.description ? <p className="text-xs text-muted-foreground">{criterion.description}</p> : null}</div><strong className="whitespace-nowrap">{criterion.maxPoints} b.</strong></div>)}{!task.criteria.length ? <p className="text-sm text-muted-foreground">Před publikováním doplňte kritéria.</p> : null}<p className="text-sm font-semibold">Celkem {task.maxPoints} bodů</p></CardContent></Card></div>
  <Card><CardContent className="pt-6"><TaskAttachments taskId={task.id} canManage={canManage} /></CardContent></Card>
  {role === "STUDENT" ? <Card><CardHeader><CardTitle>Moje práce k tomuto zadání</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Otevřete svou práci, nahrajte WIP nebo finální verzi a prohlédněte si historii.</p><Button onClick={() => router.push(ownHref)}>{task.submissions.length ? "Otevřít moji práci" : "Odevzdat práci"}</Button></CardContent></Card> : <Card><CardHeader><CardTitle>{canManage ? "Studenti a odevzdání" : "Přiřazené studentské práce"}</CardTitle><p className="text-sm text-muted-foreground">{canManage ? "Odevzdalo " + submitted + " z " + rows.length + " studentů. Každý student má jednu práci s vlastní historií verzí." : "Otevřete konkrétního studenta a verzi práce, kterou máte hodnotit."}</p></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2" role="group" aria-label="Filtrovat studenty podle odevzdání"><Button type="button" size="sm" variant={submissionFilter === "all" ? "default" : "outline"} onClick={() => { setSubmissionFilter("all"); setPage(1); }}>Všichni ({rows.length})</Button><Button type="button" size="sm" variant={submissionFilter === "missing" ? "default" : "outline"} onClick={() => { setSubmissionFilter("missing"); setPage(1); }}>Neodevzdali ({rows.length - submitted})</Button></div><DataTable tableId="task-submissions" clientPagination data={filtered} columns={[
   { key: "name", label: "Student", render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.email}</p></div> },
   { key: "stage", label: "Poslední verze", sortValue: (row) => row.latest ? (row.latest.stage === "WIP" ? "Rozpracováno" : "Finální") + " " + row.latest.version : null, render: (row) => row.latest ? <Badge variant={row.latest.stage === "WIP" ? "secondary" : "default"}>{row.latest.stage === "WIP" ? "Rozpracováno (WIP)" : "Finální"} · v{row.latest.version}</Badge> : <Badge variant="outline">Neodevzdáno</Badge> },
   { key: "submittedAt", label: "Odevzdáno", sortValue: (row) => row.latest ? new Date(row.latest.submittedAt).getTime() : null, render: (row) => row.latest ? new Date(row.latest.submittedAt).toLocaleString(locale) : "—" },
   { key: "versionCount", label: "Počet verzí" },
   { key: "review", label: "Hodnocení poslední verze", sortValue: (row) => !row.latest ? null : row.latest.stage === "WIP" ? "Průběžná práce" : !row.latest.evaluations.length ? "Nepřiřazeno" : row.latest.evaluations.every((review: { status: string }) => review.status === "COMPLETED") ? "Dokončeno" : "Probíhá", render: (row) => !row.latest ? "—" : row.latest.stage === "WIP" ? "Průběžná práce" : !row.latest.evaluations.length ? "Nepřiřazeno" : row.latest.evaluations.every((review: { status: string }) => review.status === "COMPLETED") ? "Dokončeno" : "Probíhá" },
   { key: "publication", label: publication("title"), sortValue: (row) => isPublished(row.latest) ? "published" : "", render: (row) => row.latest?.stage === "FINAL" ? <Badge variant={isPublished(row.latest) ? "default" : "secondary"}>{publication(isPublished(row.latest) ? "published" : "private")}</Badge> : "—" },
  ]} total={filtered.length} page={page} limit={limit} onSearch={setSearch} onPageChange={setPage} onLimitChange={setLimit} onRowClick={(row) => router.push("/" + locale + "/tasks/" + task.id + "/students/" + row.id)} searchPlaceholder="Vyhledat studenta v zadání…" /></CardContent></Card>}
 </div></AppShell>;
}
