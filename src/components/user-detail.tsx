"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type User = {
  id: string; name: string; email: string; institution: string | null; externalId: string | null;
  roles: string[]; isActive: boolean; organizationId: string | null; organization: { name: string } | null;
  createdAt: string; updatedAt: string; _count: { taughtClasses: number; classMemberships: number; createdSubjects: number; createdTasks: number; submissions: number; evaluations: number };
};
const roleLabels = { USER: "Uživatel", ADMIN: "Administrátor", SCHOOL_ADMIN: "Správce školy", TEACHER: "Učitel", EVALUATOR: "Hodnotitel", STUDENT: "Student" };

export function UserDetail({ user, self, admin = true }: { user: User; self: boolean; admin?: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: user.name, email: user.email, institution: user.institution || "", externalId: user.externalId || "", roles: user.roles, isActive: user.isActive });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Uložení selhalo.");
      setMessage("Změny uživatele byly uloženy."); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Uložení selhalo."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <Link href="/users" className="text-sm text-primary underline">Zpět na uživatele</Link>
    <header><h1 className="text-3xl font-bold tracking-tight">{user.name}</h1><p className="mt-2 text-sm text-muted-foreground">Detail uživatele a nastavení účtu</p></header>
    <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
      <Card><CardHeader><CardTitle>Vlastnosti uživatele</CardTitle></CardHeader><CardContent>
        <form onSubmit={(event) => void save(event)} className="space-y-6">
          <fieldset disabled={busy} className="space-y-5">
            {([{ key: "name", label: "Jméno", type: "text" }, { key: "email", label: "E-mail", type: "email" }, { key: "externalId", label: "Školní ID", type: "text" }, { key: "institution", label: "Instituce v profilu", type: "text" }] as const).map(({ key, label, type }) => <div key={key} className="space-y-2"><Label htmlFor={`user-${key}`}>{label}</Label><Input id={`user-${key}`} type={type} value={values[key]} required={key === "name" || key === "email"} minLength={key === "name" ? 2 : undefined} maxLength={key === "email" ? 254 : 200} onChange={(event) => setValues((old) => ({ ...old, [key]: event.target.value }))} /></div>)}
            <div className="space-y-2"><p className="text-sm font-medium">Organizace</p>{user.organizationId && admin ? <Link className="text-primary underline" href={`/settings/organizations/${encodeURIComponent(user.organizationId)}`}>{user.organization?.name}</Link> : <p className="text-sm">{user.organization?.name || "Bez organizace"}</p>}</div>
            <fieldset className="space-y-3"><legend className="mb-3 text-sm font-medium">Oprávnění</legend>{Object.entries(roleLabels).map(([role, label]) => <label key={role} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.roles.includes(role)} disabled={!admin || self && role === "ADMIN" || (user.roles.includes("STUDENT") ? role !== "STUDENT" : role === "STUDENT") || !user.organizationId && ["SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(role)} onChange={(event) => setValues((old) => ({ ...old, roles: event.target.checked ? [...old.roles, role] : old.roles.filter((item) => item !== role) }))} />{label}</label>)}</fieldset>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.isActive} disabled={self || !admin} onChange={(event) => setValues((old) => ({ ...old, isActive: event.target.checked }))} />Aktivní účet</label>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
          <Button disabled={busy || !values.roles.length}>{busy ? "Ukládání…" : "Uložit změny"}</Button>
        </form>
      </CardContent></Card>
      <div className="space-y-6"><Card><CardHeader><CardTitle>Aktivita uživatele</CardTitle></CardHeader><CardContent><dl className="space-y-3">{Object.entries({ "Vyučované třídy": user._count.taughtClasses, "Členství ve třídách": user._count.classMemberships, "Předměty": user._count.createdSubjects, "Vytvořená zadání": user._count.createdTasks, "Odevzdání": user._count.submissions, "Hodnocení": user._count.evaluations }).map(([label, count]) => <div key={label} className="flex justify-between gap-4 text-sm"><dt>{label}</dt><dd className="font-medium">{count}</dd></div>)}</dl></CardContent></Card>
      <Card><CardHeader><CardTitle>Informace o účtu</CardTitle></CardHeader><CardContent><dl className="space-y-4 text-sm"><div><dt className="text-muted-foreground">ID účtu</dt><dd className="break-all">{user.id}</dd></div><div><dt className="text-muted-foreground">Vytvořen</dt><dd>{new Date(user.createdAt).toLocaleString("cs-CZ")}</dd></div><div><dt className="text-muted-foreground">Poslední změna</dt><dd>{new Date(user.updatedAt).toLocaleString("cs-CZ")}</dd></div></dl></CardContent></Card></div>
    </div>
  </div>;
}
