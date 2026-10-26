"use client";
import {SchoolGradingSettings} from "@/components/school-grading-settings";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserPlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const roleLabels: Record<string, string> = { ADMIN: "Správce platformy", SCHOOL_ADMIN: "Správce školy", TEACHER: "Učitel", EVALUATOR: "Hodnotitel", STUDENT: "Student" };
const staffRoles = ["SCHOOL_ADMIN", "TEACHER", "EVALUATOR"];
type Member = { id: string; name: string; email: string; role: string; roles: string[] };
type SchoolData = { organization: { id: string; name: string; gradingScale?: unknown } | null; members: Member[]; canManage: boolean; roles: string[] };
function RoleChoices({ value, onChange, disabled, student = false }: { value: string[]; onChange: (roles: string[]) => void; disabled: boolean; student?: boolean }) {
  const options = student ? [...staffRoles, "STUDENT"] : staffRoles;
  return <div className="flex flex-wrap gap-4">{options.map((role) => <label key={role} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.includes(role)} disabled={disabled} onChange={(event) => onChange(event.target.checked ? role === "STUDENT" ? [role] : [...value.filter((item) => item !== "STUDENT"), role] : value.filter((item) => item !== role))} />{roleLabels[role]}</label>)}</div>;
}
function MemberEditor({ member, disabled, save }: { member: Member; disabled: boolean; save: (id: string, roles: string[]) => Promise<boolean> }) {
  const initial = member.roles.length ? member.roles : [member.role];
  const [roles, setRoles] = useState(initial.filter((role) => role !== "ADMIN"));
  if (initial.includes("STUDENT")) return <div className="border-t py-3"><p className="font-medium">{member.name}</p><p className="text-sm text-muted-foreground">{member.email} · Student</p></div>;
  return <div className="space-y-3 border-t py-4"><div><p className="font-medium">{member.name}</p><p className="text-sm text-muted-foreground">{member.email}{initial.includes("ADMIN") ? " · Správce platformy" : ""}</p></div><RoleChoices value={roles} onChange={setRoles} disabled={disabled} /><Button size="sm" variant="outline" disabled={disabled || !roles.length || JSON.stringify(roles.slice().sort()) === JSON.stringify(initial.filter((role) => role !== "ADMIN").sort())} onClick={() => void save(member.id, roles)}>Uložit oprávnění</Button></div>;
}
export function OrganizationSettings({ title = "Moje škola", organizationId }: { title?: string; organizationId?: string }) {
  const { update } = useSession();
  const targetQuery = organizationId ? "?organizationId=" + encodeURIComponent(organizationId) : "";
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SchoolData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState(["TEACHER", "EVALUATOR"]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [invitation, setInvitation] = useState("");
  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/organization" + targetQuery, { signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Školu se nepodařilo načíst.");
    setData(result); setName(result.organization?.name || "");
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/organization" + targetQuery, { signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Školu se nepodařilo načíst.");
      if (!controller.signal.aborted) { setData(result); setName(result.organization?.name || ""); }
    }).catch((error) => { if (!controller.signal.aborted) setMessage(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [targetQuery]);
  async function mutate(url: string, method: string, body: object): Promise<boolean> {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(url + targetQuery, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Změna se nepodařila.");
      if (result.token) { setInvitation(window.location.origin + "/" + locale + "/invitations/" + result.token); setMessage("Pozvánka platí 7 dní. Odkaz předejte pozvanému člověku."); }
      else { await update(); await load(); router.refresh(); setMessage("Uloženo."); }
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Změna se nepodařila."); return false; }
    finally { setBusy(false); }
  }
  const members = (data?.members || []).filter((member) => (member.name + " " + member.email).toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs")));
  const memberRoles = (member: Member) => (member.roles.length ? member.roles : [member.role]).map((role) => roleLabels[role] || role).join(", ");
  return <div className="space-y-5">
    <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-5">
      {loading ? <p>Načítání školy…</p> : !data ? <p>Školu se nepodařilo načíst. Obnovte stránku a zkuste to znovu.</p> : data.organization ? <>
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xl font-semibold tracking-tight">{data.organization.name}</p><p className="mt-2 text-sm text-muted-foreground">{data.roles.length ? "Školní oprávnění: " + data.roles.filter((role) => role !== "ADMIN").map((role) => roleLabels[role] || role).join(", ") : "Správa organizace jako správce platformy"}</p></div>{data.canManage && <Button variant="outline" onClick={() => { setName(data.organization?.name || ""); setMessage(""); setSchoolOpen(true); }}><Pencil className="size-4" />Upravit školu</Button>}</div>
        {!data.canManage && <p className="text-sm text-muted-foreground">Členy a oprávnění spravuje správce vaší školy.</p>}
      </> : <form className="max-w-lg space-y-3" onSubmit={(event) => { event.preventDefault(); void mutate("/api/organization", "POST", { name }); }}><p className="text-sm text-muted-foreground">Založte vlastní školu, nebo přijměte pozvánku od jejího správce. Zakladatel získá oprávnění správce školy, učitele a hodnotitele.</p><Label htmlFor="new-school-name">Název nové školy</Label><Input id="new-school-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={200} required disabled={busy} /><Button disabled={busy}>Založit školu</Button></form>}
      {message && !inviteOpen && !selectedMember && !schoolOpen ? <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">{message}</p> : null}
    </CardContent></Card>
    {data?.organization && data.canManage && <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Členové a oprávnění</CardTitle><p className="mt-2 text-sm text-muted-foreground">Kliknutím na člena zobrazíte jeho oprávnění. Pracovníci školy mohou kombinovat více rolí.</p></div><Button onClick={() => { setInviteOpen(true); setMessage(""); }}><UserPlus className="size-4" />Pozvat člena</Button></div></CardHeader><CardContent><DataTable tableId="organization-members" clientPagination data={members} total={members.length} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch} searchPlaceholder="Vyhledat člena školy…" onRowClick={(member) => { setSelectedMember(member); setMessage(""); }} columns={[
      { key: "name", label: "Jméno", render: (member: Member) => <span className="font-medium">{member.name}</span> },
      { key: "email", label: "E-mail" },
      { key: "roles", label: "Oprávnění", sortValue: memberRoles, render: (member: Member) => <span className="text-sm">{memberRoles(member)}</span> },
    ]} /></CardContent></Card>}
    {data?.organization && data.canManage && <SchoolGradingSettings key={data.organization.id} value={data.organization.gradingScale} targetQuery={targetQuery} onSaved={load} />}
    <Dialog open={schoolOpen} onOpenChange={(open) => { if (!busy) setSchoolOpen(open); }}><DialogContent><DialogHeader><DialogTitle>Upravit školu</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void mutate("/api/organization", "PATCH", { name }).then((saved) => { if (saved) setSchoolOpen(false); }); }}><div className="space-y-2"><Label htmlFor="school-name">Název školy</Label><Input id="school-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={200} required disabled={busy} /></div>{message && <p role="status" className="text-sm">{message}</p>}<Button disabled={busy}>Uložit název školy</Button></form></DialogContent></Dialog>
    <Dialog open={Boolean(selectedMember)} onOpenChange={(open) => { if (!open && !busy) setSelectedMember(null); }}><DialogContent><DialogHeader><DialogTitle>Oprávnění člena školy</DialogTitle><DialogDescription>Externího hodnotitele z jiné školy přiřazujte přímo ke konkrétní práci.</DialogDescription></DialogHeader>{selectedMember && <MemberEditor key={selectedMember.id + selectedMember.roles.join(",")} member={selectedMember} disabled={busy} save={async (id, value) => { const saved = await mutate("/api/organization/members/" + id, "PATCH", { roles: value }); if (saved) setSelectedMember(null); return saved; }} />}{message && <p role="status" className="text-sm">{message}</p>}</DialogContent></Dialog>
    <Dialog open={inviteOpen} onOpenChange={(open) => { if (!busy) setInviteOpen(open); }}><DialogContent><DialogHeader><DialogTitle>Pozvat do školy</DialogTitle><DialogDescription>Vyberte oprávnění a vytvořte odkaz pro nového člena.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setInvitation(""); void mutate("/api/organization/invitations", "POST", { email, roles }); }}><div className="space-y-2"><Label htmlFor="invite-email">E-mail pozvaného</Label><Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} /></div><fieldset disabled={busy}><legend className="mb-3 text-sm font-medium">Oprávnění — lze kombinovat</legend><RoleChoices value={roles} onChange={setRoles} disabled={busy} student /></fieldset><Button disabled={busy || !roles.length}>Vytvořit pozvánku</Button>{invitation && <div className="space-y-2 rounded-lg border bg-muted/30 p-3"><Label htmlFor="invite-link">Odkaz pozvánky</Label><Input id="invite-link" readOnly value={invitation} onFocus={(event) => event.target.select()} /><Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(invitation).then(() => setMessage("Odkaz zkopírován.")).catch(() => setMessage("Odkaz označte a zkopírujte ručně."))}>Kopírovat odkaz</Button></div>}{message && <p role="status" className="text-sm">{message}</p>}</form></DialogContent></Dialog>
  </div>;
}
