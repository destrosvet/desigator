"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { resultPublicationBlock, type PublicationReview } from "@/lib/result-publication-policy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
const errors = ["notFinal", "noReviews", "incomplete", "draftTask", "forbidden", "unauthorized", "invalidInput", "notFound"];
export function ResultPublicationControls({ submissionId, stage, publishedAt, reviews, maxPoints, taskStatus }: { submissionId: string; stage: string; publishedAt?: string | null; reviews: PublicationReview[]; maxPoints: number; taskStatus: string }) {
 const t = useTranslations("publication"); const locale = useLocale(); const router = useRouter();
 const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
 const published = Boolean(publishedAt);
 const block = taskStatus === "DRAFT" ? "draftTask" : resultPublicationBlock(stage, reviews, maxPoints);
 async function save() {
  if (busy) return; setBusy(true); setError(""); setMessage("");
  try {
   const response = await fetch("/api/submissions/" + submissionId + "/publication", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !published }) });
   const data = await response.json();
   if (!response.ok) { setError(t("errors." + (errors.includes(data.error) ? data.error : "serverError"))); return; }
   setConfirm(false); setMessage(t(published ? "withdrawnSuccess" : "publishedSuccess")); router.refresh();
  } catch { setError(t("errors.serverError")); } finally { setBusy(false); }
 }
 return <section className="space-y-3 rounded-lg border p-4" aria-label={t("title")}>
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="space-y-1"><h3 className="font-semibold">{t("title")}</h3><div className="flex flex-wrap items-center gap-2 text-sm"><Badge variant={published ? "default" : "secondary"}>{t(published ? "published" : "private")}</Badge>{publishedAt ? <time dateTime={publishedAt}>{new Date(publishedAt).toLocaleString(locale)}</time> : null}</div></div><Button variant={published ? "outline" : "default"} disabled={busy || (!published && Boolean(block))} onClick={() => { setError(""); setMessage(""); setConfirm(true); }}>{t(published ? "withdraw" : "publish")}</Button></div>
  {!published && block ? <p className="text-sm text-muted-foreground">{t("errors." + block)}</p> : null}
  {message ? <p role="status" className="text-sm">{message}</p> : null}
  {!confirm && error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  <AlertDialog open={confirm} onOpenChange={(open) => { if (!busy) setConfirm(open); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t(published ? "confirmWithdraw" : "confirmPublish")}</AlertDialogTitle><AlertDialogDescription>{t(published ? "withdrawDescription" : "publishDescription")}</AlertDialogDescription></AlertDialogHeader>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<AlertDialogFooter><AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void save(); }}>{t(busy ? "saving" : published ? "withdraw" : "publish")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </section>;
}
