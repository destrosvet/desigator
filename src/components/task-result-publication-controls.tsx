"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import type { TaskPublicationSummary } from "@/lib/task-publication-policy";

export function TaskResultPublicationControls({ taskId, summary }: { taskId: string; summary: TaskPublicationSummary }) {
 const router = useRouter();
 const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
 async function save() {
  if (busy) return;
  setBusy(true); setError(""); setMessage("");
  try {
   const response = await fetch("/api/tasks/" + taskId + "/publication", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !summary.enabled }) });
   const result = await response.json();
   if (!response.ok) throw new Error(result.error === "draftTask" ? "Nejprve publikujte zadání." : "Zveřejnění se nepodařilo změnit.");
   setConfirm(false);
   setMessage(summary.enabled ? "Průběžné zveřejňování bylo vypnuto. Výsledky zadání jsou neveřejné." : "Průběžné zveřejňování bylo zapnuto. Dokončená hodnocení i jejich další úpravy se zobrazují automaticky.");
   router.refresh();
  } catch (reason) { setError(reason instanceof Error ? reason.message : "Změna se nezdařila."); }
  finally { setBusy(false); }
 }
 return <section aria-label="Zveřejnění výsledků celého zadání" className="space-y-3 rounded-xl border bg-card p-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="space-y-1"><h2 className="font-semibold">Zveřejnění výsledků celého zadání</h2><Badge variant={summary.enabled ? "default" : "secondary"}>{summary.enabled ? "Průběžně zveřejňováno" : "Nezveřejněno"}</Badge></div><Button variant={summary.enabled ? "outline" : "default"} disabled={busy || (!summary.enabled && summary.draft)} onClick={() => { setError(""); setMessage(""); setConfirm(true); }}>{summary.enabled ? "Vypnout zveřejňování výsledků" : "Zapnout průběžné zveřejňování"}</Button></div>
  <p className="text-sm" data-testid="task-publication-progress">{summary.completed} z {summary.total} finálních prací má dokončené hodnocení · {summary.pending} čeká</p>
  <p className="text-sm text-muted-foreground">Učitel nebo správce zapíná zveřejňování pro celé zadání, bez ohledu na filtr gridu. Dokončená hodnocení se pak zobrazují studentům i v zapnutém veřejném odkazu skupiny. Hodnotitelé mohou body dál upravovat; změny i další dokončená hodnocení se projeví automaticky. Rozpracované body a komentáře zůstávají neveřejné.</p>
  {summary.draft && !summary.enabled ? <p className="text-sm text-muted-foreground">Nejprve publikujte zadání.</p> : null}
  {message ? <p role="status" className="text-sm">{message}</p> : null}
  {!confirm && error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{summary.enabled ? "Vypnout zveřejňování celého zadání?" : "Zapnout průběžné zveřejňování celého zadání?"}</AlertDialogTitle><AlertDialogDescription>{summary.enabled ? "Výsledky tohoto zadání se skryjí studentům i ve veřejném odkazu skupiny. Uložená hodnocení se nesmažou." : "Dokončená hodnocení se zobrazí hned. Další dokončené práce a úpravy bodů se budou zobrazovat automaticky. Hodnotitelé mohou pokračovat v práci; není třeba dokončit všechna hodnocení najednou."}</AlertDialogDescription></AlertDialogHeader>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Zrušit</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void save(); }}>{busy ? "Ukládání…" : summary.enabled ? "Vypnout zveřejňování" : "Zapnout zveřejňování"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </section>;
}
