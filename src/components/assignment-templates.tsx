"use client";

import { useEffect, useState } from "react";
import { TaskEditor, type EditableTask } from "@/components/task-editor";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export type AssignmentTemplate = Omit<EditableTask, "deadline" | "status">;
export function AssignmentTemplates() {
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [editing, setEditing] = useState<AssignmentTemplate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  async function load() {
    const res = await fetch("/api/task-templates");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Načtení šablon selhalo.");
    setTemplates(data.templates);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/task-templates").then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Načtení šablon selhalo.");
      if (active) setTemplates(data.templates);
    }).catch((reason) => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const filtered = templates.filter((item) => item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <Card>
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Moje šablony zadání</CardTitle><Button onClick={() => setEditing({ id: "", title: "", description: "", instructions: "", maxPoints: 100, criteria: [{ name: "Zpracování", description: "", maxPoints: 100 }] })}>Nová šablona</Button></div><CardDescription>Vlastní pokyny a hodnoticí kritéria pro opakované použití. Třídu a termín zvolíte až u konkrétního zadání. Změny šablony neovlivní dříve vytvořená zadání.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {editing && <TaskEditor key={editing.id || "new"} task={{ ...editing, status: "DRAFT", deadline: null }} rubricLocked={false} templateMode onClose={() => setEditing(null)} onSave={async (data) => {
        const res = await fetch("/api/task-templates", { method: editing.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, id: editing.id }) });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Uložení šablony selhalo.");
        await load();
      }} />}
      {loading ? <p>Načítání šablon…</p> : <DataTable tableId="assignment-templates" clientPagination data={filtered} total={filtered.length} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch} searchPlaceholder="Vyhledat šablonu…" columns={[{ key: "title", label: "Šablona" }, { key: "maxPoints", label: "Maximum bodů" }, { key: "criteria", label: "Kritéria", sortValue: (item: AssignmentTemplate) => item.criteria.map((c) => c.name).join(", "), render: (item: AssignmentTemplate) => item.criteria.map((c) => c.name).join(", ") }]} onRowClick={setEditing} onDeleteRows={async (ids) => {
        const res = await fetch("/api/task-templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, confirmed: true }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Smazání selhalo.");
        if (editing && ids.includes(editing.id)) setEditing(null);
        await load();
      }} />}
    </CardContent>
  </Card>;
}
