"use client";

import { PublicResultsControl } from "@/components/public-results-control";
import { StudentList } from "@/components/student-list";
import { StudentImport } from "@/components/student-import";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Student = { id: string; name: string; email: string; externalId?: string | null };
type ClassDetail = {
  id: string; name: string; code: string; description: string | null; academicYear: number | null; publicResultsEnabled: boolean;
  teacher: { name: string; email: string };
  students: Array<{ joinedAt: string; student: Student }>;
  subjects: Array<{ id: string; name: string; code: string; year: number; semester: string }>;
};

export function ClassDetailClient({ targetClass, role, locale }: { targetClass: ClassDetail; role: string; locale: string }) {
  const router = useRouter();
  const [studentRevision, setStudentRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [promotionName, setPromotionName] = useState(targetClass.name);
  const [promotionYear, setPromotionYear] = useState((targetClass.academicYear ?? new Date().getFullYear()) + 1);
  const [promoting, setPromoting] = useState(false);
  const canManage = role === "ADMIN" || role === "TEACHER";

  async function promoteClass() {
    setPromoting(true); setMessage("");
    try {
      const response = await fetch(`/api/classes/${targetClass.id}/promote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: promotionName, academicYear: promotionYear }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Postup skupiny se nezdařil.");
      router.push(`/${locale}/classes/${result.class.id}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Postup skupiny se nezdařil."); }
    finally { setPromoting(false); }
  }
  async function leaveClass() {
    const response = await fetch(`/api/classes/${targetClass.id}`, { method: "DELETE" });
    if (response.ok) router.push(`/${locale}/classes`);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {message ? <p role="alert" className="text-destructive">{message}</p> : null}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex items-center gap-2"><h1 className="text-3xl font-bold">{targetClass.name}</h1><Badge variant="outline">{targetClass.code}</Badge></div><p className="text-muted-foreground">{targetClass.description || "Bez popisu"}</p>{targetClass.academicYear ? <p className="text-sm text-muted-foreground">Akademický rok {targetClass.academicYear}/{String(targetClass.academicYear + 1).slice(-2)}</p> : null}</div>
          {!canManage ? <Button variant="destructive" onClick={leaveClass}>Opustit třídu</Button> : null}
        </div>

        {canManage && <PublicResultsControl classId={targetClass.id} enabled={targetClass.publicResultsEnabled} missingIds={targetClass.students.filter(({student})=>!student.externalId?.trim()).length} locale={locale} />}

        <Card><CardHeader><CardTitle>Učitel</CardTitle></CardHeader><CardContent><p>{targetClass.teacher.name}</p><p className="text-sm text-muted-foreground">{targetClass.teacher.email}</p></CardContent></Card>

        {canManage ? <Card><CardHeader><CardTitle>Další akademický rok</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Vytvoří novou studijní skupinu a zkopíruje do ní všech {targetClass.students.length} studentů. Předměty, práce a výsledky zůstanou v tomto roce.</p><div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]"><div className="space-y-2"><Label htmlFor="promotion-name">Název nové skupiny</Label><Input id="promotion-name" value={promotionName} onChange={(event) => setPromotionName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="promotion-year">Začátek roku</Label><Input id="promotion-year" type="number" min={2000} max={2100} value={promotionYear} onChange={(event) => setPromotionYear(Number(event.target.value))} /></div><Button className="self-end" disabled={promoting || !promotionName.trim()} onClick={() => void promoteClass()}>{promoting ? "Vytváření…" : "Postoupit skupinu"}</Button></div></CardContent></Card> : null}

        {canManage ? <section aria-label="Studenti třídy" className="space-y-4">
          <h2 className="text-xl font-semibold">Studenti</h2>
          <StudentImport classId={targetClass.id} className={targetClass.name} onImported={() => setStudentRevision(value => value + 1)} />
          <StudentList fixedClassId={targetClass.id} fixedClassName={targetClass.name} refreshVersion={studentRevision} />
        </section> : <Card><CardHeader><CardTitle>Studenti ({targetClass.students.length})</CardTitle></CardHeader><CardContent className="space-y-2">{targetClass.students.map(({ student }) => <p key={student.id}>{student.name}</p>)}</CardContent></Card>}

        {canManage && targetClass.subjects.length > 0 && <Card><CardHeader><CardTitle>Přehled výsledků a známek</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{targetClass.subjects.map(subject=><Button key={subject.id} variant="outline" onClick={()=>router.push(`/${locale}/subjects/${subject.id}/results`)}>{subject.name} · {subject.year}</Button>)}</CardContent></Card>}

        <Card><CardHeader><CardTitle>Předměty</CardTitle></CardHeader><CardContent className="space-y-2">{targetClass.subjects.map((subject) => <button key={subject.id} type="button" onClick={() => router.push(`/${locale}/subjects/${subject.id}`)} className="flex w-full justify-between rounded border p-3 text-left hover:bg-muted"><span>{subject.name}</span><span className="text-muted-foreground">{subject.code} · {subject.year}</span></button>)}{!targetClass.subjects.length ? <p className="text-muted-foreground">Zatím bez předmětů.</p> : null}</CardContent></Card>
      </div>
    </AppShell>
  );
}