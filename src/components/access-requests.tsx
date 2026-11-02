"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { Link } from "@/components/navigation";
import { canCreateOrganization } from "@/lib/permissions";
type AccessRequest = { id: string; requestedRole: string; reason: string; status: string; reviewNote: string | null; createdAt: string; user?: { name: string; email: string } };
const labels: Record<string, string> = { PENDING: "Čeká na schválení", APPROVED: "Schváleno", REJECTED: "Zamítnuto", TEACHER: "Učitel", SCHOOL_ADMIN: "Správce školy" };
export function AccessRequests({ admin = false }: { admin?: boolean }) {
  const { data: session, update } = useSession();
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20); const [search, setSearch] = useState("");
  const [role, setRole] = useState("TEACHER"); const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<AccessRequest | null>(null); const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(admin ? "/api/access-requests?" + new URLSearchParams({ scope: "admin", page: String(page), limit: String(limit), search }) : "/api/access-requests", { signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Načtení žádostí selhalo.");
    if (admin) { setRequests(result.requests); setTotal(result.total); } else setRequest(result.request);
  }, [admin, page, limit, search]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void load(controller.signal).catch((e) => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); });
    return () => controller.abort();
  }, [load]);
  async function save(data: object, method: "POST" | "PATCH") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/access-requests", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      await load(); setSelected(null); setMessage(method === "POST" ? "Žádost byla odeslána administrátorovi." : "Žádost byla vyřízena.");
    } catch (e) { setError(e instanceof Error ? e.message : "Uložení selhalo."); }
    finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>{admin ? "Žádosti o vyšší oprávnění" : "Moje oprávnění"}</CardTitle><CardDescription>{admin ? "Schválením umožníte uživateli vyučovat nebo založit vlastní organizaci. Oprávnění platí v rozsahu jeho školy." : "Vyšší oprávnění schvaluje administrátor platformy. Student ani základní uživatel nemohou zakládat školu."}</CardDescription></CardHeader><CardContent className="space-y-4">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    {loading ? <p>Načítání žádostí…</p> : admin ? <DataTable tableId="access-requests" data={requests.map((r) => ({ ...r, name: r.user?.name }))} total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch} onRowClick={(row) => { setSelected(row); setNote(""); setError(""); }} onEditRow={(row) => { setSelected(row); setNote(""); setError(""); }} columns={[{ key: "name", label: "Uživatel" }, { key: "email", label: "E-mail", render: (row) => row.user?.email }, { key: "requestedRole", label: "Požadované oprávnění", render: (row) => labels[row.requestedRole] }, { key: "createdAt", label: "Podáno", render: (row) => new Date(row.createdAt).toLocaleDateString("cs-CZ") }]} /> : <>
      {request && <div className="space-y-2 rounded-lg border p-4 text-sm"><p className="font-medium">{labels[request.requestedRole]} — {labels[request.status]}</p><p className="whitespace-pre-wrap">{request.reason}</p>{request.reviewNote && <p>Poznámka administrátora: {request.reviewNote}</p>}</div>}
      {session?.user && canCreateOrganization(session.user) && <Button asChild><Link href="/settings?section=school">Založit vlastní školu</Link></Button>}
      {request?.status !== "PENDING" && !canCreateOrganization(session?.user || { id: "", role: "USER" }) && <form className="max-w-xl space-y-4" onSubmit={(event) => { event.preventDefault(); void save({ requestedRole: role, reason }, "POST"); }}><div className="space-y-2"><Label htmlFor="requested-role">Požadované oprávnění</Label><select id="requested-role" className="h-10 w-full rounded border bg-background px-3" value={role} onChange={(event) => setRole(event.target.value)} disabled={busy}><option value="TEACHER">Učitel</option><option value="SCHOOL_ADMIN">Správce školy</option></select></div><div className="space-y-2"><Label htmlFor="access-reason">Pro jakou školu a proč oprávnění potřebujete?</Label><Textarea id="access-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={2000} required disabled={busy} /></div><Button disabled={busy}>{busy ? "Odesílání…" : "Požádat o oprávnění"}</Button></form>}
      <Button variant="outline" disabled={busy} onClick={() => { setError(""); void Promise.all([load(), update()]).catch((e) => setError(e.message)); }}>Aktualizovat stav a oprávnění</Button>
    </>}
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open && !busy) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>Posoudit žádost</DialogTitle><DialogDescription>{selected?.user?.name} · {selected?.user?.email} · {labels[selected?.requestedRole || ""]}</DialogDescription></DialogHeader><p className="whitespace-pre-wrap text-sm">{selected?.reason}</p><Label htmlFor="review-note">Poznámka pro uživatele</Label><Textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} disabled={busy} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-2"><Button disabled={busy} onClick={() => void save({ id: selected?.id, decision: "APPROVED", reviewNote: note }, "PATCH")}>Schválit</Button><Button variant="outline" disabled={busy} onClick={() => void save({ id: selected?.id, decision: "REJECTED", reviewNote: note }, "PATCH")}>Zamítnout</Button></div></DialogContent></Dialog>
  </CardContent></Card>;
}
