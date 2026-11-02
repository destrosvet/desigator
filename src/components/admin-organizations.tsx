"use client";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/components/navigation";
import { useEffect, useState } from "react";
import { Building2, Users, BookOpen } from "lucide-react";
import { manageTableRows } from "@/lib/table-management";
import { DataTable } from "@/components/data-table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Organization = { id: string; name: string; createdAt: string; _count: { users: number; classes: number } };
export function AdminOrganizations() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [rows, setRows] = useState<Organization[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/organizations", { signal: controller.signal }).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || "Načtení organizací selhalo."); setRows(data.organizations); }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const filtered = rows.filter((row) => row.name.toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs")));
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setCreateError("");
    try {
      const response = await fetch("/api/admin/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Vytvoření organizace selhalo.");
      router.push(`/${locale}/settings/organizations/${encodeURIComponent(result.organization.id)}`);
    } catch (reason) { setCreateError(reason instanceof Error ? reason.message : "Vytvoření organizace selhalo."); setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="flex justify-end"><Button onClick={() => { setName(""); setCreateError(""); setCreateOpen(true); }}>Vytvořit organizaci</Button></div>
    <Dialog open={createOpen} onOpenChange={(open) => { if (!busy) setCreateOpen(open); }}><DialogContent><DialogHeader><DialogTitle>Nová organizace</DialogTitle><DialogDescription>Po založení můžete na stránce organizace pozvat její členy a správce.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => void create(event)}><div className="space-y-2"><Label htmlFor="new-organization-name">Název organizace</Label><Input id="new-organization-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={200} required disabled={busy} /></div>{createError && <p role="alert" className="text-sm text-destructive">{createError}</p>}<Button disabled={busy}>{busy ? "Vytváření…" : "Vytvořit organizaci"}</Button></form></DialogContent></Dialog>
    <div className="grid gap-3 sm:grid-cols-3">{[{ label: "Organizace", value: rows.length, icon: Building2 }, { label: "Účty v organizacích", value: rows.reduce((sum, row) => sum + row._count.users, 0), icon: Users }, { label: "Třídy", value: rows.reduce((sum, row) => sum + row._count.classes, 0), icon: BookOpen }].map(({ label, value, icon: Icon }) => <Card key={label} className="gap-2 py-4"><CardContent className="flex items-center gap-4"><div className="rounded-xl bg-accent p-3 text-accent-foreground"><Icon className="size-5" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold tracking-tight">{loading ? "—" : value}</p></div></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Organizace</CardTitle><CardDescription>Přehled škol a institucí na platformě. Kliknutím na řádek otevřete údaje organizace.</CardDescription></CardHeader><CardContent className="space-y-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <p>Načítání organizací…</p> : <DataTable onEditRow={(row) => router.push(`/${locale}/settings/organizations/${encodeURIComponent(row.id)}`)} onDeleteRows={async (ids) => { await manageTableRows("organizations", ids); setRows((old) => old.filter((row) => !ids.includes(row.id))); }} tableId="admin-organizations" clientPagination data={filtered} total={filtered.length} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch} searchPlaceholder="Vyhledat organizaci…" onRowClick={(row) => router.push(`/${locale}/settings/organizations/${encodeURIComponent(row.id)}`)} columns={[
        { key: "name", label: "Název organizace", render: (row: Organization) => <Link href={`/settings/organizations/${encodeURIComponent(row.id)}`} className="font-medium hover:underline" onClick={(event) => event.stopPropagation()}>{row.name}</Link> },
        { key: "users", label: "Členové", sortValue: (row: Organization) => row._count.users, render: (row: Organization) => row._count.users },
        { key: "classes", label: "Třídy", sortValue: (row: Organization) => row._count.classes, render: (row: Organization) => row._count.classes },
        { key: "createdAt", label: "Založeno", sortValue: (row: Organization) => new Date(row.createdAt).getTime(), render: (row: Organization) => new Date(row.createdAt).toLocaleDateString("cs") },
      ]} />}
    </CardContent></Card>
  </div>;
}
