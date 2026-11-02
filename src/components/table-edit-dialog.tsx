"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { manageTableRows, type TableManagement } from "@/lib/table-management";

export function TableEditDialog({ management, ids, rows, onClose }: { management: TableManagement; ids: string[]; rows: Record<string, unknown>[]; onClose: () => void }) {
  const fields = management.fields.filter((field) => ids.length === 1 || !["name", "title", "originalName"].includes(field.key));
  const initial = rows.find((row) => row.id === ids[0]);
  const [enabled, setEnabled] = useState<string[]>(ids.length === 1 ? fields.filter((field) => field.type !== "number" || initial?.[field.key] != null).map((field) => field.key) : []);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.key, ids.length === 1 && initial?.[field.key] != null ? String(initial[field.key]) : field.options?.[0]?.value || (field.type === "boolean" ? "true" : "")])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = Object.fromEntries(fields.filter((field) => enabled.includes(field.key)).map((field) => [field.key, field.key === "roles" ? values[field.key].split(",") : field.type === "boolean" ? values[field.key] === "true" : field.type === "number" ? Number(values[field.key]) : values[field.key]]));
      await manageTableRows(management.entity, ids, data, management.contextId);
      await management.onSaved(); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Uložení selhalo."); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{ids.length === 1 ? "Upravit záznam" : "Hromadná úprava"}</DialogTitle><DialogDescription>Vybráno {ids.length} záznamů. Zaškrtněte vlastnosti, které chcete změnit. Ostatní hodnoty zůstanou zachované.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => void save(event)}>
    <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-sm">{rows.filter((row) => ids.includes(String(row.id))).map((row) => <li key={String(row.id)}>{String(row.name || row.title || row.originalName || row.id)}</li>)}</ul>
    {fields.map((field) => <div key={field.key} className="space-y-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled.includes(field.key)} disabled={busy} onChange={(event) => setEnabled((old) => event.target.checked ? [...old, field.key] : old.filter((key) => key !== field.key))} />Změnit: {field.label}</label><Label htmlFor={`table-edit-${field.key}`} className="sr-only">{field.label}</Label>{field.type === "boolean" || field.type === "select" ? <select id={`table-edit-${field.key}`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" disabled={busy || !enabled.includes(field.key)} value={values[field.key]} onChange={(event) => setValues((old) => ({ ...old, [field.key]: event.target.value }))}>{(field.type === "boolean" ? field.options || [{ value: "true", label: "Aktivní" }, { value: "false", label: "Neaktivní / archivováno" }] : field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <Input id={`table-edit-${field.key}`} type={field.type === "number" ? "number" : "text"} required={field.type === "number"} disabled={busy || !enabled.includes(field.key)} value={values[field.key]} onChange={(event) => setValues((old) => ({ ...old, [field.key]: event.target.value }))} />}</div>)}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-2"><Button disabled={busy || !enabled.length}>{busy ? "Ukládání…" : ids.length === 1 ? "Uložit změny" : `Uložit změny (${ids.length})`}</Button><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Zrušit</Button></div>
  </form></DialogContent></Dialog>;
}
