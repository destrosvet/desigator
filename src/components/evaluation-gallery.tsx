"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { FileImage, Search, Loader2 } from "lucide-react";
import { Link } from "@/components/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { attachmentUrl, PREVIEW_IMAGE_TYPES, type WorkAttachment } from "@/lib/media";

type GalleryWork = {
  id: string; status: string; totalPoints: number | null;
  evaluator: { name: string };
  submission: { id: string; student?: { name: string }; attachments: WorkAttachment[]; task: { title: string; maxPoints: number; subject: { name: string } } };
};

export const evaluationStatusLabels: Record<string, string> = { PENDING: "Čeká na hodnocení", IN_PROGRESS: "Rozpracováno", COMPLETED: "Dokončeno" };

function Cover({ file }: { file?: WorkAttachment }) {
  const [failed, setFailed] = useState(false);
  return file && !failed ? <img src={attachmentUrl(file.id, "thumbnail")} alt={`Náhled ${file.originalName}`} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain transition-transform duration-150 group-hover:scale-[1.025]" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><FileImage className="size-7" /><span className="text-xs">{failed ? "Náhled není dostupný" : "Bez náhledu"}</span></div>;
}

type GalleryProps = { evaluations: GalleryWork[]; total: number; page: number; limit: number; search: string; status: string; taskId?: string; studentId?: string; evaluatorId?: string; tasks: Array<{ id: string; title: string }>; anonymous: boolean; showEvaluator: boolean };

export function EvaluationGallery({ evaluations, total, page, limit, search, status, taskId, studentId, evaluatorId, tasks, anonymous, showEvaluator }: GalleryProps) {
  const locale = useLocale();
  const [items, setItems] = useState(evaluations);
  const [currentPage, setCurrentPage] = useState(page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = currentPage * limit < total;
  const loadMore = useCallback(async () => {
    if (loadingRef.current || currentPage * limit >= total) return;
    loadingRef.current = true; setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ page: String(currentPage + 1), limit: String(limit), search, ...(status ? { status } : {}), ...(taskId ? { taskId } : {}), ...(studentId ? { studentId } : {}), ...(evaluatorId ? { evaluatorId } : {}) });
      const response = await fetch(`/api/evaluations?${query}`);
      if (!response.ok) throw new Error("Další práce se nepodařilo načíst.");
      const result = await response.json();
      setItems((current) => [...new Map([...current, ...result.evaluations].map((item: GalleryWork) => [item.id, item])).values()]);
      setCurrentPage((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Načítání selhalo."); }
    finally { loadingRef.current = false; setLoading(false); }
  }, [currentPage, evaluatorId, limit, search, status, studentId, taskId, total]);

  useEffect(() => {
    if (!sentinel.current || !hasMore || error || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) void loadMore(); }, { rootMargin: "600px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [error, hasMore, loadMore]);

  return <div className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">{tasks.find((task) => task.id === taskId)?.title || "Práce k hodnocení"}</h1><p className="mt-1 text-sm text-muted-foreground">Vyberte práci z gridu. V detailu hodnotíte posuvníky a studenty přepínáte šipkami ← →.</p></div><Badge variant="secondary" className="px-3 py-1">{total} prací</Badge></header>
    <form method="get" action={`/${locale}/evaluations`} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      {studentId ? <input type="hidden" name="studentId" value={studentId} /> : null}
      {evaluatorId ? <input type="hidden" name="evaluatorId" value={evaluatorId} /> : null}
      <input type="hidden" name="limit" value={limit} />
      <div className="min-w-44 flex-1 space-y-1"><Label htmlFor="review-search" className="text-xs">{anonymous ? "Zadání nebo zpětná vazba" : "Student nebo zadání"}</Label><Input id="review-search" name="search" defaultValue={search} placeholder="Vyhledat práci…" /></div>
      <div className="min-w-44 flex-1 space-y-1"><Label htmlFor="review-task" className="text-xs">Zadání</Label><select id="review-task" name="taskId" defaultValue={taskId || ""} className="h-9 w-full rounded-md border bg-background px-2 text-sm">{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor="review-status" className="text-xs">Stav</Label><select id="review-status" name="status" defaultValue={status} className="h-9 w-full rounded-md border bg-background px-2 text-sm"><option value="">Všechny stavy</option>{Object.entries(evaluationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <Button type="submit" variant="secondary"><Search className="mr-1.5 size-4" />Filtrovat</Button>
    </form>
    {!items.length ? <div className="rounded-xl border border-dashed py-16 text-center"><FileImage className="mx-auto mb-3 size-9 text-muted-foreground" /><h2 className="font-semibold">Žádné práce v tomto výběru</h2><p className="mt-2 text-sm text-muted-foreground">Upravte filtr. Nové práce se zobrazí po přiřazení hodnocení.</p></div> : <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" aria-label="Grid studentských prací">
      {items.map((evaluation, itemIndex) => {
        const image = evaluation.submission.attachments.find((file) => PREVIEW_IMAGE_TYPES.has(file.mimeType));
        const anonymousNumber = (page - 1) * limit + itemIndex + 1;
        const studentLabel = anonymous ? `Anonymní práce ${anonymousNumber}` : evaluation.submission.student?.name || "Studentská práce";
        return <Link key={evaluation.id} href={`/evaluations/${evaluation.id}`} className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Hodnotit ${studentLabel}: ${evaluation.submission.task.title}`}>
          <div className="relative aspect-[4/3] overflow-hidden border-b bg-muted/40 p-1.5"><Cover file={image} /><span className="absolute right-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px]">{evaluation.submission.attachments.length} pohledů</span><span title={evaluationStatusLabels[evaluation.status]} className={`absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${evaluation.status === "COMPLETED" ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/95 dark:text-emerald-200" : evaluation.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-900 dark:bg-amber-950/95 dark:text-amber-200" : "bg-background/90 text-muted-foreground"}`}>{evaluation.status === "COMPLETED" ? `${evaluation.totalPoints ?? 0} / ${evaluation.submission.task.maxPoints} b.` : evaluation.status === "IN_PROGRESS" ? "Rozpracováno" : "Nehodnoceno"}</span></div>
          <div className="space-y-0.5 px-2.5 py-2"><h2 className="truncate text-sm font-semibold">{studentLabel}</h2>{!taskId ? <p className="truncate text-xs text-muted-foreground" title={evaluation.submission.task.title}>{evaluation.submission.task.title}</p> : null}{showEvaluator ? <p className="truncate text-[11px] text-muted-foreground">{evaluation.evaluator.name}</p> : null}</div>
        </Link>;
      })}
    </div>}
    <div ref={sentinel} className="flex min-h-10 flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Zobrazeno {items.length} z {total} prací</span>{hasMore ? <Button variant="outline" size="sm" onClick={() => void loadMore()} disabled={loading}>{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{error ? "Zkusit načíst znovu" : "Načíst další práce"}</Button> : null}{error ? <p role="alert" className="text-destructive">{error}</p> : null}</div>
  </div>;
}
