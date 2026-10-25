"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Comment = { id: string; content: string; createdAt: string; author: { id: string; name: string } };
export function ConsultationThread({ submissionId, version }: { submissionId: string; version: number }) {
  const t = useTranslations("consultation");
  const locale = useLocale();
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const endpoint = "/api/submissions/" + encodeURIComponent(submissionId) + "/comments";
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) { setComments(data.comments); setCursor(data.nextCursor); setLoaded(true); }
      } catch { if (!controller.signal.aborted) setError(t("loadError")); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, reload, t]);
  async function older() {
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint + "?before=" + encodeURIComponent(cursor!), { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setComments((current) => [...data.comments, ...current]); setCursor(data.nextCursor);
    } catch { setError(t("loadError")); } finally { setBusy(false); }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      if (!response.ok) { setError(t(response.status === 429 ? "rateLimit" : "saveError")); return; }
      const data = await response.json();
      setComments((current) => [...current, data.comment]); setContent(""); setNotice(t("saved"));
    } catch { setError(t("saveError")); } finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>{t("title", { version })}</CardTitle><p className="text-sm text-muted-foreground">{t("description")}</p></CardHeader><CardContent className="space-y-4">
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={loading || busy} onClick={() => setReload((value) => value + 1)}>{t("refresh")}</Button>{cursor ? <Button type="button" variant="outline" disabled={loading || busy} onClick={() => void older()}>{t("older")}</Button> : null}</div>
    {loading ? <p role="status">{t("loading")}</p> : loaded && !comments.length ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : null}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <ol aria-label={t("messages")} className="space-y-3">{comments.map((comment) => <li key={comment.id} className="rounded-lg border p-3"><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><strong>{comment.author.name}</strong><time dateTime={comment.createdAt} className="text-muted-foreground">{new Date(comment.createdAt).toLocaleString(locale)}</time></div><p className="whitespace-pre-wrap break-words">{comment.content}</p></li>)}</ol>
    <form onSubmit={(event) => void send(event)} className="space-y-2"><label htmlFor={"consultation-" + submissionId} className="text-sm font-medium">{t("label")}</label><Textarea id={"consultation-" + submissionId} value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={3} required disabled={busy} /><p className="text-xs text-muted-foreground">{t("limit", { count: content.length })}</p><Button type="submit" disabled={busy || loading || !loaded || !content.trim()}>{t(busy ? "sending" : "send")}</Button></form>
    {notice ? <p role="status" className="text-sm">{notice}</p> : null}
  </CardContent></Card>;
}
