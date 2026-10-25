"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/data-table";
import type { ImportDecision } from "@/lib/student-import";

type Sheet = { name: string; rows: string[][] };
type Mapping = { name: string; first: string; last: string; email: string; externalId: string };
type Result = { created: number; added: number; skipped: number; filled: number; credentials: { email: string; password: string }[] };
const emptyMapping: Mapping = { name: "", first: "", last: "", email: "", externalId: "" };
export function StudentImport({ classId, className }: { classId: string; className: string }) {
  const router = useRouter(); const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false); const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheet, setSheet] = useState(0); const [header, setHeader] = useState(1);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping);
  const [encoding, setEncoding] = useState("utf-8"); const [separator, setSeparator] = useState("auto");
  const [excluded, setExcluded] = useState<number[]>([]);
  const [preview, setPreview] = useState<{ rows: ImportDecision[]; expected: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [confirm, setConfirm] = useState(false);
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20); const [search, setSearch] = useState("");
  const raw = sheets[sheet]?.rows || []; const headers = raw[header - 1] || [];
  const width = Math.min(50, Math.max(0, ...raw.map((row) => row.length)));
  const value = (row: string[], field: keyof Mapping) => mapping[field] === "" ? "" : (row[Number(mapping[field])] || "").trim();
  const mapped = raw.slice(header).map((row, index) => ({ row: header + index + 1, name: mapping.name ? value(row, "name") : [value(row, "first"), value(row, "last")].filter(Boolean).join(" "), email: value(row, "email"), externalId: value(row, "externalId") })).filter((row) => row.name || row.email || row.externalId);
  const selected = mapped.filter((row) => !excluded.includes(row.row));
  const display = mapped.map((row) => ({ ...row, id: String(row.row), decision: preview?.rows.find((item) => item.row === row.row), excluded: excluded.includes(row.row) })).filter((row) => (row.name + row.email + row.externalId).toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs")));
  function invalidate() { setPreview(null); setError(""); setPage(1); }
  async function readFile() {
    setBusy(true); setError(""); setPreview(null); setResult(null);
    try {
      const file = fileInput.current?.files?.[0]; if (!file) throw new Error("Vyberte soubor.");
      const body = new FormData(); body.append("file", file); body.append("encoding", encoding); body.append("separator", separator);
      const res = await fetch("/api/classes/" + classId + "/students/import-file", { method: "POST", body }); const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSheets(data.sheets); setSheet(0); setHeader(1); setMapping(emptyMapping); setExcluded([]); setPage(1); setSearch("");
    } catch (reason) { setSheets([]); setError(reason instanceof Error ? reason.message : "Načtení selhalo."); }
    finally { setBusy(false); }
  }
  async function checkOrImport(committing: boolean) {
    setBusy(true); setError("");
    try {
      if (!mapping.email || (!mapping.name && (!mapping.first || !mapping.last))) throw new Error("Přiřaďte e-mail a celé jméno nebo jméno i příjmení.");
      if (!selected.length || selected.length > 200) throw new Error("Vyberte 1 až 200 studentů v jedné dávce.");
      const res = await fetch("/api/classes/" + classId + "/students/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: selected, confirmed: committing, expected: preview?.expected }) }); const data = await res.json();
      if (!res.ok) { if (committing) setPreview(null); throw new Error(data.error); }
      if (committing) { setResult(data); setConfirm(false); router.refresh(); }
      else setPreview(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Import selhal."); setConfirm(false); }
    finally { setBusy(false); }
  }
  function download() {
    if (!result) return;
    const cell = (value: string) => '"' + (/^[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
    const csv = "\uFEFF" + [["E-mail", "Heslo"], ...result.credentials.map((item) => [item.email, item.password])].map((row) => row.map(cell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "pristupy-studentu.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const actions = preview?.rows.reduce((sum, row) => sum + Number(row.action !== "skip" && row.action !== "error"), 0) || 0;
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>Importovat studenty z CSV / Excelu</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}><DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>Import studentů do třídy {className}</DialogTitle></DialogHeader>
      {result ? <div className="space-y-4"><p role="status">Import dokončen. Nové účty: {result.created}. Existující studenti: {result.added}. Beze změny: {result.skipped}. Doplněná školní ID: {result.filled}.</p>{result.credentials.length > 0 && <><p className="text-sm">Stáhněte a bezpečně předejte přihlašovací údaje nových studentů. Hesla se znovu nezobrazí po opuštění této stránky. Existujícím studentům se heslo nemění.</p><Button onClick={download}>Stáhnout přístupy nových studentů</Button></>}<Button variant="outline" onClick={() => { setResult(null); setSheets([]); setPreview(null); }}>Další import</Button></div> : <fieldset disabled={busy} className="min-w-0 space-y-4">
        <p className="text-sm text-muted-foreground">1. Nahrajte export. 2. Přiřaďte sloupce. 3. Zkontrolujte náhled a potvrďte import. Účty vyžadují jméno a e-mail; školní ID se použije pro párování odevzdaných souborů.</p>
        <div className="space-y-2"><Label htmlFor="student-import-file">CSV nebo Excel (.xlsx), do 5 MB</Label><Input id="student-import-file" type="file" ref={fileInput} accept=".csv,.xlsx" onChange={() => { setSheets([]); setPreview(null); }} /></div>
        <div className="flex flex-wrap items-end gap-3"><div className="space-y-1"><Label htmlFor="csv-encoding">Kódování CSV</Label><select id="csv-encoding" className="h-9 rounded border bg-background px-2" value={encoding} onChange={(event) => { setEncoding(event.target.value); setSheets([]); setPreview(null); }}><option value="utf-8">UTF-8</option><option value="windows-1250">Windows-1250 (čeština)</option></select></div><div className="space-y-1"><Label htmlFor="csv-separator">Oddělovač CSV</Label><select id="csv-separator" className="h-9 rounded border bg-background px-2" value={separator} onChange={(event) => { setSeparator(event.target.value); setSheets([]); setPreview(null); }}><option value="auto">Automaticky</option><option value="semicolon">Středník</option><option value="comma">Čárka</option><option value="tab">Tabulátor</option></select></div><Button onClick={() => void readFile()}>{busy ? "Zpracovávání…" : "Načíst soubor"}</Button></div>
        {sheets.length > 0 && <>
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="import-sheet">List souboru</Label><select id="import-sheet" className="h-9 w-full rounded border bg-background px-2" value={sheet} onChange={(event) => { setSheet(Number(event.target.value)); setMapping(emptyMapping); setExcluded([]); invalidate(); }}>{sheets.map((item, index) => <option key={index} value={index}>{item.name}</option>)}</select></div><div className="space-y-1"><Label htmlFor="import-header">Řádek se záhlavím</Label><Input id="import-header" type="number" min={1} max={raw.length || 1} value={header} onChange={(event) => { setHeader(Math.max(1, Number(event.target.value) || 1)); setExcluded([]); setMapping(emptyMapping); invalidate(); }} /></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{([["name", "Celé jméno"], ["first", "Jméno"], ["last", "Příjmení"], ["email", "E-mail"], ["externalId", "Školní ID"]] as const).map(([key, label]) => <div key={key} className="space-y-1"><Label htmlFor={"map-" + key}>{label}</Label><select id={"map-" + key} className="h-9 w-full rounded border bg-background px-2" value={mapping[key]} onChange={(event) => { setMapping((current) => ({ ...current, [key]: event.target.value, ...(key === "name" && event.target.value ? { first: "", last: "" } : (key === "first" || key === "last") && event.target.value ? { name: "" } : {}) })); invalidate(); }}><option value="">Nepřiřazeno</option>{Array.from({ length: width }, (_, index) => <option key={index} value={String(index)}>{index + 1}. {headers[index] || "Bez názvu"} · např. {(raw[header]?.[index] || "—").slice(0, 50)}</option>)}</select></div>)}</div>
          <p className="text-sm">Vybráno {selected.length} z {mapped.length} neprázdných řádků. Maximum 200 studentů na dávku. Existující jména a hesla se nepřepisují; chybějící školní ID lze doplnit.</p>
          <DataTable tableId="student-import-preview" clientPagination data={display} total={display.length} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch} searchPlaceholder="Vyhledat v importu…" columns={[
            { key: "row", label: "Řádek" }, { key: "name", label: "Jméno" }, { key: "email", label: "E-mail" }, { key: "externalId", label: "Školní ID" },
            { key: "state", label: "Kontrola", sortValue: (row) => row.decision?.message || "", render: (row) => row.excluded ? "Vynecháno" : row.decision ? <span className={row.decision.action === "error" ? "text-destructive" : ""}>{row.decision.message}</span> : "Zatím nezkontrolováno" },
            { key: "include", label: "Zahrnout", sortValue: (row) => Number(!row.excluded), render: (row) => <input type="checkbox" aria-label={"Zahrnout řádek " + row.row} checked={!row.excluded} onChange={(event) => { setExcluded((current) => event.target.checked ? current.filter((item) => item !== row.row) : [...current, row.row]); invalidate(); }} /> },
          ]} />
          <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => void checkOrImport(false)} disabled={!selected.length || selected.length > 200}>Zkontrolovat import</Button><Button onClick={() => setConfirm(true)} disabled={!preview || preview.rows.some((row) => row.action === "error") || !actions}>Importovat do třídy</Button></div>
          {preview?.rows.some((row) => row.action === "error") && <p role="alert" className="text-sm text-destructive">Opravte přiřazení nebo vynechte chybné řádky a spusťte kontrolu znovu. Zatím nebylo nic zapsáno.</p>}
        </>}
      </fieldset>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </DialogContent></Dialog>
    <AlertDialog open={confirm} onOpenChange={(next) => { if (!busy) setConfirm(next); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Potvrdit import studentů</AlertDialogTitle><AlertDialogDescription>Do třídy {className} bude importováno {actions} řádků. Nové účty dostanou náhodná hesla, existující se přidají do třídy podle náhledu. Až nyní se změny uloží.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Zrušit</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void checkOrImport(true); }}>{busy ? "Importování…" : "Potvrdit import"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
