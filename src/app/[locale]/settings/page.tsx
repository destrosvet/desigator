"use client";
import { PasswordForm } from "@/components/password-form";
import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, School, UserRound, Palette, Files } from "lucide-react";
import { OrganizationSettings } from "@/components/organization-settings";
import { AdminOrganizations } from "@/components/admin-organizations";
import { ThemeControl } from "@/components/theme-control";
import { InstitutionSettings } from "@/components/institution-settings";
import { AssignmentTemplates } from "@/components/assignment-templates";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { rolesOf, isAdmin, showSchoolWorkspace, showPersonalTemplates } from "@/lib/permissions";

function SettingsContent() {
  const { data: session, status } = useSession();
  const roles = useTranslations("roles");
  const params = useSearchParams(); const pathname = usePathname(); const router = useRouter();
  const user = session?.user; const admin = user ? isAdmin(user) : false;
  const templates = user ? showPersonalTemplates(user) : false;
  const school = user ? showSchoolWorkspace(user) : false;
  const sections = [
    ...(admin ? [{ id: "organizations", label: "Organizace", icon: Building2 }] : []),
    ...(school ? [{ id: "school", label: admin ? "Působení ve škole" : "Moje škola a členové", icon: School }] : []),
    ...(templates ? [{ id: "templates", label: "Moje šablony", icon: Files }] : []),
    { id: "profile", label: "Můj profil", icon: UserRound },
    { id: "appearance", label: "Vzhled", icon: Palette },
  ];
  const requested = params.get("section");
  const active = sections.some((section) => section.id === requested) ? requested! : admin ? "organizations" : "profile";
  if (status === "loading") return <div className="p-6 text-sm text-muted-foreground">Načítání nastavení…</div>;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{admin ? "Správa platformy" : "Váš pracovní prostor"}</p><h1 className="text-3xl font-bold tracking-tight">Nastavení</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{admin ? "Organizace a školní oprávnění odděleně od vašeho osobního nastavení." : "Škola, šablony a osobní preference přehledně na jednom místě."}</p></div></header>
    <Tabs value={active} onValueChange={(section) => { const query = new URLSearchParams(params.toString()); query.set("section", section); router.replace(pathname + "?" + query, { scroll: false }); }} className="gap-6">
      <div className="overflow-x-auto pb-1"><TabsList aria-label="Sekce nastavení" className="h-auto min-w-max justify-start gap-1 rounded-xl border bg-card p-1.5">{sections.map(({ id, label, icon: Icon }) => <TabsTrigger key={id} value={id} className="gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"><Icon className="size-4" />{label}</TabsTrigger>)}</TabsList></div>
      {admin && <TabsContent value="organizations"><AdminOrganizations /></TabsContent>}
      {school && <TabsContent value="school"><OrganizationSettings title={admin ? "Působení ve škole" : "Moje škola"} /></TabsContent>}
      {templates && <TabsContent value="templates"><AssignmentTemplates /></TabsContent>}
      <TabsContent value="profile"><Card className="max-w-3xl"><CardHeader><CardTitle>Můj profil</CardTitle><CardDescription>Informace o vašem přihlášeném účtu.</CardDescription></CardHeader><CardContent className="space-y-6"><div className="flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-xl font-semibold text-accent-foreground">{user?.name?.charAt(0) || "?"}</div><div><p className="font-semibold">{user?.name}</p><p className="text-sm text-muted-foreground">{user?.email}</p></div></div><dl className="grid gap-4 border-t pt-5 sm:grid-cols-2"><div><dt className="text-xs font-medium text-muted-foreground">Jméno</dt><dd className="mt-1 text-sm">{user?.name}</dd></div><div><dt className="text-xs font-medium text-muted-foreground">E-mail</dt><dd className="mt-1 break-all text-sm">{user?.email}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-medium text-muted-foreground">Oprávnění účtu</dt><dd className="mt-2 flex flex-wrap gap-2">{user && rolesOf(user).map((role) => <span key={role} className="rounded-full border bg-muted px-3 py-1 text-xs">{role === "SCHOOL_ADMIN" ? "Správce školy" : roles(role)}</span>)}</dd></div></dl>{templates && <InstitutionSettings />}</CardContent></Card><div className="mt-6"><PasswordForm mode="change" /></div></TabsContent>
      <TabsContent value="appearance"><Card className="max-w-3xl"><CardHeader><CardTitle>Vzhled aplikace</CardTitle><CardDescription>Zvolte barevný režim. Volba se zapamatuje v tomto prohlížeči.</CardDescription></CardHeader><CardContent><ThemeControl expanded /></CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
export default function SettingsPage() { return <AppShell><Suspense fallback={<p>Načítání nastavení…</p>}><SettingsContent /></Suspense></AppShell>; }
