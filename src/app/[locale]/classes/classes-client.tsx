"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClassManagementTable } from "@/components/class-management-table";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";

type ClassItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  academicYear: number | null;
  isActive: boolean;
  teacher: { name: string };
  _count: { students: number; subjects: number };
};

type OrganizationOption = { id: string; name: string };

export function ClassesClient({ classes, role, locale, organizations, defaultOrganizationId }: { classes: ClassItem[]; role: string; locale: string; organizations: OrganizationOption[]; defaultOrganizationId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const today = new Date();
  const [academicYear, setAcademicYear] = useState(today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1);
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const canCreate = role === "ADMIN" || role === "TEACHER";

  async function createClass() {
    setBusy(true);
    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, academicYear, ...(role === "ADMIN" ? { organizationId } : {}) }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? "" : result.error || "Vytvoření selhalo.");
    if (response.ok) {
      setName("");
      setDescription("");
      setDialogOpen(false);
      router.refresh();
    }
  }

  async function joinClass() {
    setBusy(true);
    const response = await fetch("/api/classes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? "" : result.error || "Připojení selhalo.");
    if (response.ok) {
      setCode("");
      setDialogOpen(false);
      router.refresh();
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-3xl font-bold">Třídy</h1><p className="text-muted-foreground">Správa tříd a členství</p></div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setMessage(""); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />{canCreate ? "Nová třída" : "Připojit se"}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{canCreate ? "Vytvořit třídu" : "Připojit se ke třídě"}</DialogTitle></DialogHeader>
              {canCreate ? (
                <div className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="class-name">Název</Label><Input id="class-name" value={name} onChange={(event) => setName(event.target.value)} /></div>

                  {role === "ADMIN" ? <div className="space-y-2"><Label htmlFor="class-organization">Škola</Label><Select value={organizationId} onValueChange={setOrganizationId}><SelectTrigger id="class-organization"><SelectValue placeholder="Vyberte školu" /></SelectTrigger><SelectContent>{organizations.map((organization) => <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>)}</SelectContent></Select>{!organizations.length ? <p className="text-sm text-muted-foreground">Nejdříve založte školu v Nastavení → Organizace.</p> : null}</div> : null}
                  <div className="space-y-2"><Label htmlFor="class-description">Popis</Label><Textarea id="class-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="class-year">Začátek akademického roku</Label><Input id="class-year" type="number" min={2000} max={2100} value={academicYear} onChange={(event) => setAcademicYear(Number(event.target.value))} /><p className="text-xs text-muted-foreground">Zobrazeno jako {academicYear}/{String(academicYear + 1).slice(-2)}</p></div>
                  <Button onClick={createClass} disabled={busy || !name.trim() || (role === "ADMIN" && !organizationId)}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Vytvořit</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="class-code">Kód třídy</Label><Input id="class-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={32} /></div>
                  <Button onClick={joinClass} disabled={busy || code.length < 4}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Připojit se</Button>
                </div>
              )}
              {message ? <p role="status" className="text-sm">{message}</p> : null}
            </DialogContent>
          </Dialog>
        </div>

        <ClassManagementTable classes={classes} canManage={canCreate} locale={locale} />
        {!classes.length ? <p className="rounded-lg border p-8 text-center text-muted-foreground">Zatím nejste v žádné třídě.</p> : null}
      </div>
    </AppShell>
  );
}
