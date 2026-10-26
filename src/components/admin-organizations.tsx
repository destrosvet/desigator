"use client";
import { OrganizationSettings } from "@/components/organization-settings";
import { useEffect, useState } from "react";
import { Building2, Users, BookOpen } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Organization = { id: string; name: string; createdAt: string; _count: { users: number; classes: number } };
export function AdminOrganizations() {
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [rows, setRows] = useState<Organization[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Organization | null>(null); const [name, setName] = useState("");
  const [busy, setBusy] = useState(false); const [search, setSearch] = useState(""); const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/organizations", { signal: controller.signal }).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || "Načtení organizací selhalo."); setRows(data.organizations); }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const filtered = rows.filter((row) => row.name.toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs")));
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return; setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/organizations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, name }) }); const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Uložení selhalo.");
      setRows((items) => items.map((item) => item.id === editing.id ? { ...item, name: name.trim() } : item)); setEditing(null); setMessage("Název organizace byl uložen.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Uložení selhalo."); }
    finally { setBusy(false); }
  }
  if (selectedSchool) return <div className="space-y-5"><Button variant="outline" onClick={() => setSelectedSchool(null)}>Zpět na všechny organizace</Button><OrganizationSettings key={selectedSchool} organizationId={selectedSchool} title="Správa školy" /></div>;
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">{[{ label: "Organizace", value: rows.length, icon: Building2 }, { label: "Účty v organizacích", value: rows.reduce((sum, row) => sum + row._count.users, 0), icon: Users }, { label: "Třídy", value: rows.reduce((sum, row) => sum + row._count.classes, 0), icon: BookOpen }].map(({ label, value, icon: Icon }) => <Card key={label} className="gap-2 py-4"><CardContent className="flex items-center gap-4"><div className="rounded-xl bg-accent p-3 text-accent-foreground"><Icon className="size-5" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold tracking-tight">{loading ? "—" : value}</p></div></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Organizace</CardTitle><CardDescription>Přehled škol a institucí na platformě. Kliknutím na řádek otevřete údaje organizace.</CardDescription></CardHeader><CardContent className="space-y-3">
      {!editing && error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
      {loading ? <p>Načítání organizací…</p> : <DataTable tableId="admin-organizations" clientPagination data={filtered} total={filtered.length} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch} searchPlaceholder="Vyhledat organizaci…" onRowClick={(row) => { setEditing(row); setName(row.name); setError(""); setMessage(""); }} columns={[
        { key: "name", label: "Název organizace", render: (row: Organization) => <span className="font-medium">{row.name}</span> },
        { key: "users", label: "Členové", sortValue: (row: Organization) => row._count.users, render: (row: Organization) => row._count.users },
        { key: "classes", label: "Třídy", sortValue: (row: Organization) => row._count.classes, render: (row: Organization) => row._count.classes },
        { key: "createdAt", label: "Založeno", sortValue: (row: Organization) => new Date(row.createdAt).getTime(), render: (row: Organization) => new Date(row.createdAt).toLocaleDateString("cs") },
      ]} />}
    </CardContent></Card>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !busy) { setEditing(null); setError(""); } }}><DialogContent><DialogHeader><DialogTitle>Údaje organizace</DialogTitle><DialogDescription>{editing?._count.users} členů · {editing?._count.classes} tříd</DialogDescription></DialogHeader><form onSubmit={(event) => void save(event)} className="space-y-4"><div className="space-y-2"><Label htmlFor="organization-name">Název organizace</Label><Input id="organization-name" required minLength={2} maxLength={200} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => { if (editing) { setSelectedSchool(editing.id); setEditing(null); } }}>Spravovat členy</Button><Button disabled={busy}>{busy ? "Ukládání…" : "Uložit organizaci"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Zrušit</Button></div></form></DialogContent></Dialog>
  </div>;
}
