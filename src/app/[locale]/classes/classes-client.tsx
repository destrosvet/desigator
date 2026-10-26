"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2, Plus, Users } from "lucide-react";

type ClassItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  teacher: { name: string };
  _count: { students: number; subjects: number };
};

type OrganizationOption = { id: string; name: string };

export function ClassesClient({ classes, role, locale, organizations, defaultOrganizationId }: { classes: ClassItem[]; role: string; locale: string; organizations: OrganizationOption[]; defaultOrganizationId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canCreate = role === "ADMIN" || role === "TEACHER";

  async function createClass() {
    setBusy(true);
    const response = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, ...(role === "ADMIN" ? { organizationId } : {}) }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? "Třída byla vytvořena." : result.error || "Vytvoření selhalo.");
    if (response.ok) {
      setName("");
      setDescription("");
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
    setMessage(response.ok ? `Připojeno ke třídě ${result.class.name}.` : result.error || "Připojení selhalo.");
    if (response.ok) {
      setCode("");
      router.refresh();
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-3xl font-bold">Třídy</h1><p className="text-muted-foreground">Správa tříd a členství</p></div>
          <Dialog>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />{canCreate ? "Nová třída" : "Připojit se"}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{canCreate ? "Vytvořit třídu" : "Připojit se ke třídě"}</DialogTitle></DialogHeader>
              {canCreate ? (
                <div className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="class-name">Název</Label><Input id="class-name" value={name} onChange={(event) => setName(event.target.value)} /></div>

                  {role === "ADMIN" ? <div className="space-y-2"><Label htmlFor="class-organization">Škola</Label><Select value={organizationId} onValueChange={setOrganizationId}><SelectTrigger id="class-organization"><SelectValue placeholder="Vyberte školu" /></SelectTrigger><SelectContent>{organizations.map((organization) => <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>)}</SelectContent></Select>{!organizations.length ? <p className="text-sm text-muted-foreground">Nejdříve založte školu v Nastavení → Organizace.</p> : null}</div> : null}
                  <div className="space-y-2"><Label htmlFor="class-description">Popis</Label><Textarea id="class-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => (
            <Card key={item.id} className="min-w-0 cursor-pointer transition-shadow hover:shadow-md" onClick={() => router.push(`/${locale}/classes/${item.id}`)}>
              <CardHeader className="min-w-0"><div className="flex min-w-0 flex-col items-start gap-2"><CardTitle className="max-w-full [overflow-wrap:anywhere]">{item.name}</CardTitle><Badge variant="outline" className="max-w-full whitespace-normal text-left [overflow-wrap:anywhere]">{item.code}</Badge></div></CardHeader>
              <CardContent className="min-w-0 space-y-3 [overflow-wrap:anywhere]">
                <p className="text-sm text-muted-foreground">{item.description || "Bez popisu"}</p>
                <p className="text-sm">Učitel: {item.teacher.name}</p>
                <div className="flex gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Users className="size-4" />{item._count.students}</span><span className="flex items-center gap-1"><BookOpen className="size-4" />{item._count.subjects}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
        {!classes.length ? <p className="rounded-lg border p-8 text-center text-muted-foreground">Zatím nejste v žádné třídě.</p> : null}
      </div>
    </AppShell>
  );
}
