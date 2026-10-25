"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { attachmentUrl, uploadFileSizeLimit, type WorkAttachment } from "@/lib/media";

type Attachment = WorkAttachment & { uploadedAt: string };
export function TaskAttachments({ taskId, canManage = false }: { taskId: string; canManage?: boolean }) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const input = useRef<HTMLInputElement>(null);
  const url = "/api/tasks/" + taskId + "/attachments";
  const load = useCallback(async () => {
    const res = await fetch(url); const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Načtení příloh selhalo.");
    setFiles(data.attachments);
  }, [url]);
  useEffect(() => {
    let active = true;
    fetch(url).then(async (res) => {
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Načtení příloh selhalo.");
      if (active) setFiles(data.attachments);
    }).catch((reason) => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [url]);
  async function upload(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const selected = [...(input.current?.files || [])];
    if (!selected.length || selected.length > 5) { setError("Vyberte 1 až 5 souborů."); return; }
    if (selected.some((file) => !file.size || file.size > uploadFileSizeLimit(file.type)) || selected.reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024) { setError("Překročen limit příloh: MP4 100 MB, ostatní 25 MB, celá dávka 100 MB. Soubor nesmí být prázdný."); return; }
    setBusy(true);
    try {
      const body = new FormData(); selected.forEach((file) => body.append("files", file));
      const res = await fetch(url, { method: "POST", body }); const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nahrání příloh selhalo.");
      await load(); if (input.current) input.current.value = ""; setMessage("Přílohy byly nahrány.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nahrání příloh selhalo."); }
    finally { setBusy(false); }
  }
  const filtered = files.filter((file) => file.originalName.toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs")));
  return <section aria-label="Přílohy zadání" className="space-y-4">
    <h2 className="text-lg font-semibold">Přílohy zadání</h2>
    {canManage && <form onSubmit={(event) => void upload(event)} className="space-y-2">
      <Label htmlFor={"task-files-" + taskId}>Podklady a reference pro studenty</Label>
      <Input id={"task-files-" + taskId} ref={input} type="file" multiple disabled={busy} accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.zip,.mp4,.webm" aria-describedby={"task-files-help-" + taskId} />
      <p id={"task-files-help-" + taskId} className="text-xs text-muted-foreground">Obrázky, PDF, ZIP, MP4 a WebM. Až 5 souborů najednou; MP4 do 100 MB, ostatní do 25 MB, celá dávka do 100 MB.</p>
      <Button variant="outline" type="submit" disabled={busy}>{busy ? "Nahrávání…" : "Nahrát přílohy"}</Button>
    </form>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {loading ? <p className="text-sm">Načítání příloh…</p> : files.length ? <DataTable tableId="task-attachments" clientPagination data={filtered} total={filtered.length} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch} rowLabel={(row) => row.originalName} searchPlaceholder="Vyhledat přílohu…" columns={[
      { key: "originalName", label: "Soubor", render: (row: Attachment) => <a className="underline" href={attachmentUrl(row.id)}>{row.originalName}</a> },
      { key: "mimeType", label: "Formát" },
      { key: "size", label: "Velikost", render: (row: Attachment) => (row.size / 1024 / 1024).toLocaleString("cs", { maximumFractionDigits: 2 }) + " MB" },
      { key: "uploadedAt", label: "Nahráno", sortValue: (row: Attachment) => new Date(row.uploadedAt).getTime(), render: (row: Attachment) => new Date(row.uploadedAt).toLocaleString("cs") },
    ]} onDeleteRows={canManage ? async (ids) => {
      const res = await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, confirmed: true }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Smazání selhalo."); await load();
    } : undefined} /> : <p className="text-sm text-muted-foreground">K zadání zatím nejsou přiloženy žádné podklady.</p>}
  </section>;
}
