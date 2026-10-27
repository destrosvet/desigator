"use client";
import { TaskAttachments } from "@/components/task-attachments";

import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Grid2X2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { WorkViewer } from "@/components/work-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReviewWorkspace } from "@/hooks/use-review-workspace";
import type { ReviewQueueItem, ReviewWork } from "@/lib/review-workspace";

const statusLabels: Record<string, string> = { PENDING: "Nehodnoceno", IN_PROGRESS: "Rozpracováno", COMPLETED: "Dokončeno" };

export function EvaluationDetailClient({ evaluation, queue: initialQueue, canEdit }: { evaluation: ReviewWork; queue: ReviewQueueItem[]; canEdit: boolean }) {
  const locale = useLocale();
  const publication = useTranslations("publication");
  const review = useReviewWorkspace(evaluation, initialQueue, locale, canEdit);
  const { work, form, queue, saving, navigating, error, message, change, goTo, persist, leave, fullyRated } = review;
  const editable = canEdit && !form.readOnly;
  const { task, attachments, content } = work.submission;
  const index = queue.findIndex((item) => item.id === work.id);
  const previous = queue[index - 1];
  const next = queue[index + 1];
  const total = form.touched.reduce((sum, id) => sum + (form.scores[id]?.points || 0), 0);
  const gridHref = `/${locale}/evaluations?taskId=${task.id}`;
  const invalid = total > task.maxPoints || form.touched.some((id) => !Number.isInteger(form.scores[id].points));

  function setScore(id: string, value: string | number) {
    if (typeof value === "string" && value === "") {
      change((draft) => ({ ...draft, touched: draft.touched.filter((key) => key !== id), scores: { ...draft.scores, [id]: { ...draft.scores[id], points: 0 } } }));
      return;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    change((draft) => ({ ...draft, touched: [...new Set([...draft.touched, id])], scores: { ...draft.scores, [id]: { ...draft.scores[id], points: Math.min(draft.limits[id], Math.max(0, numeric)) } } }));
  }

  function markCriterion(id: string) {
    if (!form.touched.includes(id)) setScore(id, form.scores[id]?.points || 0);
  }

  return <AppShell compact><div className="mx-auto max-w-[1600px] space-y-3">
    <header className="flex flex-wrap items-center gap-3 pl-11 lg:pl-0">
      <Button variant="outline" size="sm" onClick={() => void leave(gridHref)} disabled={navigating}><Grid2X2 className="mr-1.5 size-4" />Grid</Button>
      <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-bold" data-testid="current-student">{work.submission.student?.name || `Anonymní práce ${index + 1}`}</h1><p className="truncate text-xs text-muted-foreground" title={task.title}>{task.title} · verze {work.submission.version ?? 1}</p></div>
      <Badge variant={form.status === "COMPLETED" ? "default" : "secondary"} className="hidden sm:inline-flex">{statusLabels[form.status]}</Badge>
      <div className="flex items-center gap-1" aria-label="Přepínání studentů">
        <Button variant="outline" size="icon" aria-label="Předchozí student" aria-keyshortcuts="Alt+ArrowLeft" title="Předchozí student (←)" onClick={() => previous && void goTo(previous.id)} disabled={!previous || navigating}><ArrowLeft className="size-4" /></Button>
        <span className="min-w-16 text-center text-sm tabular-nums" aria-label="Pořadí práce">{index + 1} / {queue.length}</span>
        <Button variant="outline" size="icon" aria-label="Další student" aria-keyshortcuts="Alt+ArrowRight" title="Další student (→). Vyplněné hodnocení se uloží a dokončí." onClick={() => next && void goTo(next.id)} disabled={!next || navigating}>{navigating ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}</Button>
      </div>
    </header>

    <section aria-label="Prohlížení studentské práce" className={navigating ? "pointer-events-none opacity-60" : ""}>
      <WorkViewer key={work.id} attachments={attachments} compact />
    </section>

    <section aria-label="Hodnocení práce" className="mx-auto w-full max-w-3xl rounded-xl border bg-card px-4 py-3 sm:px-6">
      {form.readOnly ? <p role="status" className="mb-3 text-sm text-muted-foreground">{publication("locked")}</p> : null}
      {!task.criteria.length ? <p role="alert" className="text-sm">Zadání nemá hodnoticí kritéria. Před hodnocením je musí doplnit učitel.</p> : null}
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {task.criteria.map((criterion) => <fieldset key={criterion.id} className="min-w-0 space-y-1" disabled={!editable || navigating}>
          <div className="flex items-center justify-between gap-2"><Label htmlFor={`points-${criterion.id}`} title={criterion.description || undefined} className="truncate text-xs font-medium">{criterion.name}</Label><div className="flex items-center gap-1"><Input id={`points-${criterion.id}`} type="number" min={0} max={criterion.maxPoints} step={1} value={form.touched.includes(criterion.id) ? form.scores[criterion.id]?.points ?? 0 : ""} placeholder="—" onChange={(event) => setScore(criterion.id, event.target.value)} className="h-7 w-16 px-2 text-right text-sm tabular-nums" /><span className="text-xs text-muted-foreground">/ {criterion.maxPoints}</span></div></div>
          <Slider aria-label={`${criterion.name} – posuvník`} value={[form.scores[criterion.id]?.points ?? 0]} min={0} max={criterion.maxPoints} step={1} disabled={!editable || navigating} onPointerDown={() => markCriterion(criterion.id)} onPointerUp={(event) => { const focused = document.activeElement; if (focused instanceof HTMLElement && focused.getAttribute("role") === "slider" && event.currentTarget.contains(focused)) focused.blur(); }} onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) markCriterion(criterion.id); }} onValueChange={([points]) => setScore(criterion.id, points)} onValueCommit={() => void persist("draft")} className={`min-h-8 ${form.touched.includes(criterion.id) ? "" : "opacity-50"}`} />
        </fieldset>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1"><p className="text-sm font-semibold tabular-nums">Celkem {total} / {task.maxPoints} b.</p><p role="status" aria-live="polite" className="text-xs text-muted-foreground">{saving ? "Ukládání…" : form.revision !== form.savedRevision ? "Čeká na uložení…" : message || `${form.touched.length} / ${task.criteria.length} kritérií · hotovo ${queue.filter((item) => item.status === "COMPLETED").length} / ${queue.length} prací`}</p></div>
        {editable ? <Button size="sm" aria-keyshortcuts="Control+Enter Meta+Enter" onClick={() => next ? void goTo(next.id) : void persist("complete")} disabled={navigating || invalid || !fullyRated}>{navigating || saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Check className="mr-1.5 size-4" />}{next ? "Dokončit a další" : "Dokončit hodnocení"}</Button> : null}
      </div>
      {invalid ? <p role="alert" className="mt-2 text-sm text-destructive">Zkontrolujte celé body a celkový limit zadání.</p> : null}
      {error ? <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm text-destructive"><p>{error} Přechod na jinou práci byl zastaven.</p><Button variant="outline" size="sm" onClick={() => void persist("draft")}>Zkusit uložit znovu</Button></div> : null}
    </section>

    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground"><p aria-label="Klávesové zkratky"><kbd>←</kbd> <kbd>→</kbd> přepínají práce · <kbd>Alt + ←/→</kbd> i ze slideru a formuláře · <kbd>Ctrl/⌘ + S</kbd> uloží koncept · <kbd>Ctrl/⌘ + Enter</kbd> dokončí a přejde dál</p><span>Hodnotí {work.evaluator.name}</span></div>
    <details className="rounded-lg border px-3 py-2"><summary className="cursor-pointer text-sm font-medium">Komentáře a zpětná vazba <span className="font-normal text-muted-foreground">(volitelné)</span></summary><div className="mt-3 grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="feedback">Celková zpětná vazba</Label><Textarea id="feedback" value={form.feedback} maxLength={10000} onChange={(event) => change((draft) => ({ ...draft, feedback: event.target.value }))} disabled={!editable || navigating} rows={4} placeholder="Silné stránky a doporučení…" /></div>
      <div className="space-y-3">{task.criteria.map((criterion) => <div key={criterion.id} className="space-y-1"><Label htmlFor={`comment-${criterion.id}`} className="text-xs">Komentář ke kritériu {criterion.name}</Label><Textarea id={`comment-${criterion.id}`} maxLength={2000} value={form.scores[criterion.id]?.comment || ""} disabled={!editable || navigating || !form.touched.includes(criterion.id)} placeholder={form.touched.includes(criterion.id) ? "Volitelný komentář…" : "Nejprve nastavte body."} onChange={(event) => change((draft) => ({ ...draft, scores: { ...draft.scores, [criterion.id]: { ...draft.scores[criterion.id], comment: event.target.value } } }))} rows={2} /></div>)}</div>
      {editable ? <Button variant="outline" size="sm" aria-keyshortcuts="Control+s Meta+s" className="w-fit" onClick={() => void persist("draft")} disabled={navigating || saving || invalid}>Uložit koncept</Button> : null}
    </div></details>
    <details className="rounded-lg border px-3 py-2"><summary className="cursor-pointer text-sm font-medium">Zadání a pokyny</summary><div className="mt-3 space-y-3 whitespace-pre-wrap text-sm text-muted-foreground">{task.description ? <p>{task.description}</p> : null}{task.instructions ? <p>{task.instructions}</p> : null}<TaskAttachments taskId={task.id} />{content ? <div><p className="mb-1 font-medium text-foreground">Poznámka studenta</p><p>{content}</p></div> : null}</div></details>
  </div></AppShell>;
}
