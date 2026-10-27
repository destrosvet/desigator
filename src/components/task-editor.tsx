"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rubricError, updateTaskSchema } from "@/lib/task-validation";
import { deadlineIso, localDeadlineParts } from "@/lib/task-deadline";

type Criterion = { id?: string; name: string; description: string | null; maxPoints: number };
export type EditableTask = { id: string; title: string; description: string | null; instructions: string | null; maxPoints: number; deadline: string | null; status: string; criteria: Criterion[] };
export function TaskEditor({ task, rubricLocked, onClose, templateMode = false, onSave }: { task: EditableTask; rubricLocked: boolean; onClose: () => void; templateMode?: boolean; onSave?: (data: Record<string, unknown>) => Promise<void> }) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [instructions, setInstructions] = useState(task.instructions || "");
  const [maxPoints, setMaxPoints] = useState(String(task.maxPoints));
  const initialDeadline = localDeadlineParts(task.deadline);
  const [deadlineDate, setDeadlineDate] = useState(initialDeadline.date);
  const [deadlineTime, setDeadlineTime] = useState(initialDeadline.time);
  const [criteria, setCriteria] = useState<(Criterion & { key: string })[]>(() => task.criteria.map((item) => ({ ...item, key: item.id || crypto.randomUUID() })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sum = criteria.reduce((total, item) => total + item.maxPoints, 0);
  const validation = rubricLocked ? null : rubricError(criteria, Number(maxPoints), templateMode || task.status === "PUBLISHED");
  function update(index: number, patch: Partial<Criterion>) { setCriteria((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  function move(index: number, direction: number) {
    setCriteria((items) => { const next = [...items]; const to = index + direction; if (to < 0 || to >= next.length) return items; [next[index], next[to]] = [next[to], next[index]]; return next; });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const parsed = updateTaskSchema.safeParse({ title, description, instructions, deadline: deadlineIso(deadlineDate, deadlineTime), ...(!rubricLocked ? { maxPoints: Number(maxPoints), criteria: criteria.map(({ key: _key, ...item }) => item) } : {}) });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    if (validation) { setError(validation); return; }
    setBusy(true);
    try {
      if (onSave) { await onSave(parsed.data); onClose(); return; }
      const response = await fetch("/api/tasks/" + task.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Uložení zadání selhalo.");
      router.refresh(); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Uložení zadání selhalo."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void save(event)} className="space-y-5 rounded-xl border bg-card p-5" aria-label="Úprava zadání">
    <h2 className="text-xl font-semibold">{templateMode ? "Šablona zadání a kritérií" : "Upravit zadání a kritéria"}</h2>
    <fieldset disabled={busy} className="space-y-4">
      <div className="space-y-1"><Label htmlFor="edit-task-title">Název zadání</Label><Input id="edit-task-title" value={title} maxLength={300} required onChange={(event) => setTitle(event.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="edit-task-description">Popis zadání</Label><Textarea id="edit-task-description" value={description} maxLength={20000} onChange={(event) => setDescription(event.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="edit-task-instructions">Pokyny k práci</Label><Textarea id="edit-task-instructions" value={instructions} maxLength={20000} onChange={(event) => setInstructions(event.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2">{!templateMode && <div className="space-y-2"><Label htmlFor="edit-task-deadline-date">Termín odevzdání</Label><div className="grid grid-cols-[1fr_8rem] gap-2"><Input id="edit-task-deadline-date" aria-label="Datum termínu odevzdání" type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} /><Input aria-label="Čas termínu odevzdání" type="time" value={deadlineTime} onChange={(event) => setDeadlineTime(event.target.value)} disabled={!deadlineDate} /></div><p className="text-xs text-muted-foreground">Bez zadaného času se použije 23:59. Prázdné datum znamená bez termínu.</p></div>}<div className="space-y-1"><Label htmlFor="edit-task-max">Maximum bodů zadání</Label><Input id="edit-task-max" type="number" min={1} max={10000} step={1} required value={maxPoints} disabled={rubricLocked} onChange={(event) => setMaxPoints(event.target.value)} /></div></div>
      {rubricLocked ? <p role="status" className="rounded border p-3 text-sm">Kritéria a maximum jsou uzamčené, protože už bylo přiřazeno hodnocení. Pro jinou bodovou škálu duplikujte zadání.</p> : null}
      <fieldset disabled={rubricLocked} className="space-y-3"><legend className="mb-2 font-semibold">Hodnoticí kritéria</legend>
        {criteria.map((criterion, index) => <div key={criterion.key} className="space-y-3 rounded-lg border p-3"><div className="grid gap-3 sm:grid-cols-[1fr_120px]"><div className="space-y-1"><Label htmlFor={"criterion-name-" + index}>Název kritéria {index + 1}</Label><Input id={"criterion-name-" + index} value={criterion.name} maxLength={200} required onChange={(event) => update(index, { name: event.target.value })} /></div><div className="space-y-1"><Label htmlFor={"criterion-max-" + index}>Body kritéria {index + 1}</Label><Input id={"criterion-max-" + index} type="number" min={1} max={10000} step={1} required value={Number.isFinite(criterion.maxPoints) ? criterion.maxPoints : ""} onChange={(event) => update(index, { maxPoints: event.target.value ? Number(event.target.value) : NaN })} /></div></div><div className="space-y-1"><Label htmlFor={"criterion-description-" + index}>Popis kritéria {index + 1}</Label><Textarea id={"criterion-description-" + index} value={criterion.description || ""} maxLength={2000} onChange={(event) => update(index, { description: event.target.value })} /></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label={"Posunout kritérium " + (index + 1) + " nahoru"}>Nahoru</Button><Button type="button" variant="outline" size="sm" disabled={index === criteria.length - 1} onClick={() => move(index, 1)} aria-label={"Posunout kritérium " + (index + 1) + " dolů"}>Dolů</Button><Button type="button" variant="outline" size="sm" onClick={() => setCriteria((items) => items.filter((_, i) => i !== index))} aria-label={"Odebrat kritérium " + (index + 1)}>Odebrat</Button></div></div>)}
        <Button type="button" variant="outline" disabled={criteria.length >= 50} onClick={() => setCriteria((items) => [...items, { key: crypto.randomUUID(), name: "", description: "", maxPoints: Math.max(1, Number(maxPoints) - sum) }])}>Přidat kritérium</Button>
        <p className="text-sm" aria-live="polite">Součet kritérií: {Number.isFinite(sum) ? sum : "—"} / {maxPoints} bodů</p>
        {validation ? <p className="text-sm text-destructive">{validation}</p> : null}
      </fieldset>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || Boolean(validation)}>{busy ? "Ukládání…" : templateMode ? "Uložit šablonu" : "Uložit zadání"}</Button><Button type="button" variant="outline" onClick={onClose}>Zrušit úpravy</Button></div>
    </fieldset>
  </form>;
}
