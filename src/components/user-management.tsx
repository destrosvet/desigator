"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/components/navigation";
import { manageTableRows, activeField, institutionField } from "@/lib/table-management";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rolesOf } from "@/lib/permissions";

type Role = "STUDENT" | "TEACHER" | "EVALUATOR";
type Organization = { id: string; name: string };
type ManagedUser = {
  id: string; name: string; email: string; role: string; roles: string[]; canManage: boolean;
  organizationId: string | null; organization: { name: string } | null;
  isActive: boolean; createdAt: string;
};
type UsersResponse = { users: ManagedUser[]; total: number; organizations: Organization[]; error?: string };

const roleLabels: Record<string, string> = {
  USER: "Uživatel", ADMIN: "Administrátor", SCHOOL_ADMIN: "Správce školy", TEACHER: "Učitel",
  EVALUATOR: "Hodnotitel", STUDENT: "Student",
};

export function UserManagement() {
  const { data: session } = useSession();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const admin = session?.user.role === "ADMIN";
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(admin ? "TEACHER" : "EVALUATOR");
  const [organizationId, setOrganizationId] = useState("");
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const query = new URLSearchParams({ page: String(page), limit: String(limit), ...(search ? { search } : {}) });
      const response = await fetch("/api/admin/users?" + query, { signal });
      const result = await response.json() as UsersResponse;
      if (!response.ok) throw new Error(result.error || "Načtení uživatelů selhalo.");
      setUsers(result.users); setTotal(result.total); setOrganizations(result.organizations);
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Načtení uživatelů selhalo.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [limit, page, search]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void load(controller.signal); });
    return () => controller.abort();
  }, [load]);

  function openCreate() {
    const ownOrganization = session?.user.organizationId || "";
    setName(""); setEmail(""); setRole(admin ? "TEACHER" : "EVALUATOR");
    setOrganizationId(admin ? organizations[0]?.id || "" : ownOrganization);
    setCredentials(null); setError(""); setCreateOpen(true);
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, organizationId: organizationId || null }),
      });
      const result = await response.json() as { user?: ManagedUser; tempPassword?: string; error?: string };
      if (!response.ok || !result.user || !result.tempPassword) throw new Error(result.error || "Vytvoření uživatele selhalo.");
      setCredentials({ email: result.user.email, password: result.tempPassword });
      setPage(1); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Vytvoření uživatele selhalo."); }
    finally { setBusy(false); }
  }

  const availableRoles: Array<{ value: Role; label: string }> = admin
    ? [{ value: "STUDENT", label: "Student" }, { value: "TEACHER", label: "Učitel" }, { value: "EVALUATOR", label: "Hodnotitel" }]
    : [{ value: "EVALUATOR", label: "Hodnotitel" }];
  const organizationRequired = role !== "EVALUATOR";

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-bold tracking-tight">Uživatelé</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{admin ? "Správa všech účtů na platformě, jejich rolí a příslušnosti k organizaci." : "Členové vaší školy a externí hodnotitelé dostupní pro hodnocení."}</p></div>
      <div className="flex flex-wrap gap-2">{admin && <Button asChild variant="outline"><Link href="/settings?section=access">Žádosti o oprávnění</Link></Button>}<Button onClick={openCreate}><UserPlus className="size-4" />Vytvořit uživatele</Button></div>
    </header>
    {error && !createOpen ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
    <Card><CardHeader><CardTitle>Seznam uživatelů</CardTitle><CardDescription>{loading ? "Načítání…" : `Celkem ${total} účtů v dostupném rozsahu.`}</CardDescription></CardHeader><CardContent>
      <DataTable canManageRow={(user) => user.canManage} onRowClick={(user) => { if (user.canManage) router.push(`/${locale}/users/${encodeURIComponent(user.id)}`); }} onEditRow={(user) => router.push(`/${locale}/users/${encodeURIComponent(user.id)}`)} management={{ entity: "users", fields: [institutionField, ...(admin ? [activeField] : [])], onSaved: load }} onDeleteRows={admin ? async (ids) => { await manageTableRows("users", ids); await load(); } : undefined} tableId="user-management" data={users} total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch} searchPlaceholder="Hledat jméno nebo e-mail…" columns={[
        { key: "name", label: "Jméno", render: (user: ManagedUser) => user.canManage ? <Link href={`/users/${encodeURIComponent(user.id)}`} className="font-medium hover:underline" onClick={(event) => event.stopPropagation()}>{user.name}</Link> : <span className="font-medium">{user.name}</span> },
        { key: "email", label: "E-mail" },
        { key: "roles", label: "Oprávnění", render: (user: ManagedUser) => <span>{rolesOf(user).map((item) => roleLabels[item] || item).join(", ")}</span> },
        { key: "organization", label: "Organizace", render: (user: ManagedUser) => user.organization?.name || <span className="text-muted-foreground">Externí</span> },
        { key: "isActive", label: "Stav", render: (user: ManagedUser) => user.isActive ? "Aktivní" : "Neaktivní" },
      ]} />
    </CardContent></Card>
    <Dialog open={createOpen} onOpenChange={(open) => { if (!busy) { setCreateOpen(open); if (!open) setCredentials(null); } }}><DialogContent><DialogHeader><DialogTitle>{credentials ? "Uživatel byl vytvořen" : "Nový uživatel"}</DialogTitle><DialogDescription>{credentials ? "Dočasné heslo se zobrazí pouze nyní. Předejte ho uživateli bezpečnou cestou." : "Zvolte roli a případnou příslušnost k organizaci."}</DialogDescription></DialogHeader>
      {credentials ? <div className="space-y-4"><div className="rounded-lg border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">E-mail</p><p className="font-medium">{credentials.email}</p><p className="mt-3 text-xs text-muted-foreground">Dočasné heslo</p><code className="mt-1 block break-all rounded bg-background p-2 text-sm">{credentials.password}</code></div><Button type="button" onClick={() => navigator.clipboard.writeText(`${credentials.email}\n${credentials.password}`)}>Kopírovat přihlašovací údaje</Button></div> : <form className="space-y-4" onSubmit={(event) => void createUser(event)}>
        <div className="space-y-2"><Label htmlFor="managed-user-name">Jméno</Label><Input id="managed-user-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={200} required disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="managed-user-email">E-mail</Label><Input id="managed-user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="managed-user-role">Role</Label><select id="managed-user-role" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={role} onChange={(event) => { const next = event.target.value as Role; setRole(next); if (next !== "EVALUATOR" && !organizationId) setOrganizationId(organizations[0]?.id || ""); }} disabled={busy}>{availableRoles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="managed-user-organization">Organizace</Label><select id="managed-user-organization" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required={organizationRequired} disabled={busy}><option value="" disabled={organizationRequired}>Bez organizace — externí hodnotitel</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<Button disabled={busy || organizationRequired && !organizationId}>{busy ? "Vytváření…" : "Vytvořit uživatele"}</Button>
      </form>}
    </DialogContent></Dialog>
  </div>;
}
