"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TransferGroup = { id: string; name: string; code?: string };
export type TransferStudent = { id: string; name: string };
export function StudentTransferDialog({ students, sourceGroups, onClose, onSaved }: {
  students: TransferStudent[]; sourceGroups: TransferGroup[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const t = useTranslations("studentTransfer");
  const fieldId = useId();
  const [sourceId, setSourceId] = useState(sourceGroups.length === 1 ? sourceGroups[0].id : "");
  const [targetId, setTargetId] = useState("");
  const [options, setOptions] = useState<{ sourceId: string; groups: TransferGroup[] } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!sourceId) return;
    const controller = new AbortController();
    fetch("/api/classes/" + sourceId + "/students/transfer", { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setOptions({ sourceId, groups: data.classes }); })
      .catch(() => { if (!controller.signal.aborted) setLoadError(t("errors.loadFailed")); });
    return () => controller.abort();
  }, [sourceId, t]);
  const groups = options?.sourceId === sourceId ? options.groups : null;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !sourceId || !targetId) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/classes/" + sourceId + "/students/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetClassId: targetId, studentIds: students.map(student => student.id) }) });
      const data = await response.json();
      if (!response.ok) {
        const key = ["unauthorized", "forbidden", "sameClass", "differentSchool", "membershipChanged", "invalidRequest"].includes(data.error) ? data.error : "transferFailed";
        setError(t("errors." + key)); return;
      }
      await onSaved(); onClose();
    } catch { setError(t("errors.transferFailed")); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{t("title")}</DialogTitle><DialogDescription>{t("description")}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
      <div className="space-y-1"><p className="text-sm font-medium">{t("selected", { count: students.length })}</p><ul className="max-h-32 list-disc overflow-y-auto pl-5 text-sm">{students.map(student => <li key={student.id}>{student.name}</li>)}</ul></div>
      <div className="space-y-2"><Label htmlFor={fieldId + "-source"}>{t("source")}</Label><Select value={sourceId} disabled={sourceGroups.length === 1 || busy} onValueChange={value => { setSourceId(value); setTargetId(""); setLoadError(""); setError(""); }}><SelectTrigger id={fieldId + "-source"}><SelectValue placeholder={t("chooseSource")} /></SelectTrigger><SelectContent>{sourceGroups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}{group.code ? " · " + group.code : ""}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={fieldId + "-target"}>{t("target")}</Label><Select value={targetId} onValueChange={setTargetId} disabled={busy || !groups?.length}><SelectTrigger id={fieldId + "-target"}><SelectValue placeholder={t("chooseTarget")} /></SelectTrigger><SelectContent>{groups?.map(group => <SelectItem key={group.id} value={group.id}>{group.name} · {group.code}</SelectItem>)}</SelectContent></Select></div>
      {!sourceGroups.length ? <p role="alert" className="text-sm">{t("noSource")}</p> : null}
      {sourceId && !groups && !loadError ? <p role="status" className="text-sm">{t("loading")}</p> : null}
      {groups?.length === 0 ? <p role="status" className="text-sm text-muted-foreground">{t("empty")}</p> : null}
      <p className="text-sm text-muted-foreground">{t("existing")}</p>
      {loadError || error ? <p role="alert" className="text-sm text-destructive">{error || loadError}</p> : null}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button><Button type="submit" disabled={busy || !targetId || !groups?.some(group => group.id === targetId)}>{busy ? t("busy") : t("confirm")}</Button></div>
    </fieldset></form>
  </DialogContent></Dialog>;
}
