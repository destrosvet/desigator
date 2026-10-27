"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFileSizeLimit } from "@/lib/media";
import { extractStudentId, suggestStudent } from "@/lib/import-matching";

type Student = { id: string; name: string; externalId: string | null; hasSubmission: boolean };
type Row = { file: File; studentId: string; excluded: boolean };
type Roster = { students: Student[]; subject: string; className: string; year: number };

export default function BulkUploadPage() {
  return <Suspense fallback={<AppShell>Načítání importu…</AppShell>}><BulkUploadForm /></Suspense>;
}

function BulkUploadForm() {
  const { data: session } = useSession();
  const params = useSearchParams();
  const [taskId, setTaskId] = useState(params.get("taskId") || "");
  const [tasks, setTasks] = useState<Array<{ id: string; title: string }>>([]);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState("FINAL");
  const [changeNote, setChangeNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const canUpload = ["ADMIN", "TEACHER"].includes(session?.user?.role || "");
  useEffect(() => {
    if (!canUpload) return;
    let active = true;
    void (async () => {
      try {
        const all: Array<{ id: string; title: string }> = [];
        let page = 1;
        while (active) {
          const res = await fetch("/api/tasks?limit=100&page=" + page);
          if (!res.ok) throw new Error();
          const data = await res.json(); all.push(...data.tasks);
          if (all.length >= data.total || !data.tasks.length) break;
          page++;
        }
        if (active) setTasks(all);
      } catch { if (active) setMessage("Zadání se nepodařilo načíst."); }
    })();
    return () => { active = false; };
  }, [canUpload]);
  useEffect(() => {
    if (!taskId || !canUpload) return;
    let active = true;
    fetch("/api/submissions/bulk-upload?taskId=" + encodeURIComponent(taskId)).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); return data; }).then((data) => { if (active) setRoster(data); }).catch((error) => { if (active) setMessage(error.message || "Seznam žáků se nepodařilo načíst."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [taskId, canUpload]);
  const selected = rows.filter((row) => !row.excluded);
  const invalid = selected.some((row) => !/[.](jpe?g|png|webp|gif|pdf|zip|mp4|webm|glb)$/i.test(row.file.name) || !row.studentId);
  const duplicates = new Set(selected.map((row) => JSON.stringify([row.studentId, row.file.name, row.file.size]))).size !== selected.length;
  const overLimit = selected.length > 100 || selected.some((row) => row.file.size > uploadFileSizeLimit(row.file.type)) || selected.reduce((sum, row) => sum + row.file.size, 0) > 100 * 1024 * 1024;
  function update(index: number, patch: Partial<Row>) { setConfirmed(false); setRows((items) => items.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  async function upload() {
    if (!confirmed || !selected.length || invalid || duplicates || overLimit) return;
    setBusy(true); setMessage("");
    try {
      const data = new FormData(); data.set("taskId", taskId); data.set("stage", stage); data.set("changeNote", changeNote); data.set("confirmed", "true"); data.set("studentIds", JSON.stringify(selected.map((row) => row.studentId))); selected.forEach((row) => data.append("files", row.file));
      const response = await fetch("/api/submissions/bulk-upload", { method: "POST", body: data });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Import selhal.");
      setMessage((result.replayed ? "Tato dávka již byla importována. Další verze nevznikly. Evidováno " : "Uloženo ") + result.summary.success + " souborů pro " + new Set(selected.map((row) => row.studentId)).size + " žáků.");
      setRoster((current) => current ? { ...current, students: current.students.map((student) => selected.some((row) => row.studentId === student.id) ? { ...student, hasSubmission: true } : student) } : null);
      setRows([]); setConfirmed(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import selhal."); }
    finally { setBusy(false); }
  }
  return <AppShell><div className="mx-auto max-w-5xl space-y-5"><h1 className="text-2xl font-bold">Hromadný import prací</h1><p className="text-sm text-muted-foreground">Vyberte práce ze síťového disku. U názvu 4464341_02.jpg je 4464341 školní ID, _02 rozlišuje pohled. Před potvrzením se nic nenahrává ani nezapisuje.</p>{!canUpload ? <p>Import je dostupný učiteli a administrátorovi.</p> : <>
    <fieldset disabled={busy} className="space-y-4 rounded-xl border p-4">
      <div className="space-y-1"><Label htmlFor="import-task">Zadání</Label><select id="import-task" value={taskId} className="h-10 w-full rounded border bg-background px-2" onChange={(event) => { setTaskId(event.target.value); setRoster(null); setRows([]); setConfirmed(false); setMessage(""); setLoading(Boolean(event.target.value)); }}><option value="">Vyberte zadání</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></div>
      {loading ? <p>Načítání žáků…</p> : null}
      {roster ? <><p>{roster.subject} · {roster.className} · akademický rok {roster.year} · {roster.students.length} žáků</p><div className="space-y-1"><Label htmlFor="import-stage">Stav nové verze</Label><select id="import-stage" value={stage} onChange={(event) => { setStage(event.target.value); setConfirmed(false); }} className="h-10 w-full rounded border bg-background px-2"><option value="WIP">Rozpracováno (WIP)</option><option value="FINAL">Finální</option></select></div><Label htmlFor="import-note">Popis nové verze (volitelný)</Label><Input id="import-note" value={changeNote} maxLength={2000} onChange={(event) => { setChangeNote(event.target.value); setConfirmed(false); }} /><Label htmlFor="import-files">Soubory (max. 100, MP4 do 100 MB, ostatní do 25 MB, dávka celkem 100 MB)</Label><Input id="import-files" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.zip,.mp4,.webm,.glb" onChange={(event) => { setRows(Array.from(event.target.files || []).map((file) => ({ file, studentId: suggestStudent(file.name, roster.students), excluded: false }))); setConfirmed(false); setMessage(""); event.target.value = ""; }} /></> : null}
      {rows.length ? <><div className="space-y-1"><Label htmlFor="student-search">Hledat žáka ve výběrech</Label><Input id="student-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Jméno nebo školní ID" /></div><div className="space-y-3">{rows.map((row, index) => {
        const student = roster?.students.find((item) => item.id === row.studentId);
        const options = roster?.students.filter((item) => item.id === row.studentId || (item.name + " " + item.externalId).toLocaleLowerCase().includes(search.toLocaleLowerCase())) || [];
        return <div key={index} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><LocalPreview file={row.file} /><div className="min-w-40 flex-1"><p className="break-all font-medium">{row.file.name}</p><p className="text-xs text-muted-foreground">ID z názvu: {extractStudentId(row.file.name) || "nerozpoznáno"} · {Math.ceil(row.file.size / 1024)} KB</p>{!row.excluded && !row.studentId ? <p className="text-sm text-destructive">Vyberte žáka nebo soubor vyřaďte.</p> : null}{student?.hasSubmission ? <p className="text-sm text-destructive">Žák již má práci. Vznikne nová verze, předchozí soubory a hodnocení zůstanou zachované.</p> : null}{!/[.](jpe?g|png|webp|gif|pdf|zip|mp4|webm|glb)$/i.test(row.file.name) ? <p className="text-sm text-destructive">Opravte příponu souboru před importem.</p> : null}</div><div className="min-w-52 flex-1"><Label htmlFor={"author-" + index}>Autor souboru {index + 1}</Label><select id={"author-" + index} disabled={row.excluded} value={row.studentId} onChange={(event) => update(index, { studentId: event.target.value })} className="h-10 w-full rounded border bg-background px-2"><option value="">Vyberte žáka</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.externalId || "bez ID"}{item.hasSubmission ? " · nová verze" : ""}</option>)}</select></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.excluded} onChange={(event) => update(index, { excluded: event.target.checked })} />Vyřadit</label></div>;
      })}</div><p>{selected.length} souborů · {new Set(selected.map((row) => row.studentId).filter(Boolean)).size} žáků · {rows.length - selected.length} vyřazeno</p>{duplicates ? <p role="alert">Dávka obsahuje duplicitní soubory. Vyřaďte je.</p> : null}{overLimit ? <p role="alert">Dávka překračuje limity uploadu.</p> : null}<label className="flex items-center gap-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={invalid || duplicates || overLimit || !selected.length} />Zkontroloval/a jsem autory všech vybraných souborů.</label><div className="flex flex-wrap gap-3"><Button onClick={() => void upload()} disabled={!confirmed || invalid || duplicates || overLimit || !selected.length}>{busy ? "Nahrávání…" : "Potvrdit párování a nahrát"}</Button><Button variant="outline" onClick={() => { setRows([]); setConfirmed(false); setMessage(""); }}>Zrušit výběr</Button></div></> : null}
    </fieldset></>}{message ? <p role="status" className="rounded border p-3">{message}</p> : null}</div></AppShell>;
}

function LocalPreview({ file }: { file: File }) {
  const ref = useRef<HTMLImageElement>(null);
  const supported = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
  useEffect(() => { if (!supported || !ref.current) return; const url = URL.createObjectURL(file); ref.current.src = url; return () => URL.revokeObjectURL(url); }, [file, supported]);
  return supported ? <img ref={ref} alt={file.name} className="h-16 w-20 object-contain" /> : <span className="text-xs text-muted-foreground">Bez náhledu</span>;
}
