"use client";

import { PublicResultsControl } from "@/components/public-results-control";
import { StudentImport } from "@/components/student-import";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Student = { id: string; name: string; email: string; externalId?: string | null };
type ClassDetail = {
  id: string; name: string; code: string; description: string | null; publicResultsEnabled: boolean;
  teacher: { name: string; email: string };
  students: Array<{ joinedAt: string; student: Student }>;
  subjects: Array<{ id: string; name: string; code: string; year: number; semester: string }>;
};

export function ClassDetailClient({ targetClass, candidates, role, locale }: { targetClass: ClassDetail; candidates: Student[]; role: string; locale: string }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const canManage = role === "ADMIN" || role === "TEACHER";

  async function changeMember(method: "POST" | "DELETE", id: string) {
    const response = await fetch(`/api/classes/${targetClass.id}/students`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: id }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Členství bylo upraveno." : result.error || "Operace selhala.");
    if (response.ok) {
      setStudentId("");
      router.refresh();
    }
  }

  async function leaveClass() {
    const response = await fetch(`/api/classes/${targetClass.id}`, { method: "DELETE" });
    if (response.ok) router.push(`/${locale}/classes`);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex items-center gap-2"><h1 className="text-3xl font-bold">{targetClass.name}</h1><Badge variant="outline">{targetClass.code}</Badge></div><p className="text-muted-foreground">{targetClass.description || "Bez popisu"}</p></div>
          {!canManage ? <Button variant="destructive" onClick={leaveClass}>Opustit třídu</Button> : null}
        </div>

        {canManage && <PublicResultsControl classId={targetClass.id} enabled={targetClass.publicResultsEnabled} missingIds={targetClass.students.filter(({student})=>!student.externalId?.trim()).length} locale={locale} />}

        <Card><CardHeader><CardTitle>Učitel</CardTitle></CardHeader><CardContent><p>{targetClass.teacher.name}</p><p className="text-sm text-muted-foreground">{targetClass.teacher.email}</p></CardContent></Card>

        <Card>
          <CardHeader><CardTitle>Studenti ({targetClass.students.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {canManage && <StudentImport classId={targetClass.id} className={targetClass.name} />}
            {canManage && candidates.length ? <div className="flex flex-wrap items-end gap-2"><div className="min-w-64 flex-1 space-y-2"><Label>Přidat studenta</Label><Select value={studentId} onValueChange={setStudentId}><SelectTrigger><SelectValue placeholder="Vyberte studenta" /></SelectTrigger><SelectContent>{candidates.map((student) => <SelectItem key={student.id} value={student.id}>{student.name} · {student.email}</SelectItem>)}</SelectContent></Select></div><Button onClick={() => changeMember("POST", studentId)} disabled={!studentId}>Přidat</Button></div> : null}
            {targetClass.students.map(({ student }) => <div key={student.id} className="flex items-center justify-between gap-3 border-b py-3"><div><p className="font-medium">{student.name}</p><p className="text-sm text-muted-foreground">{student.email}{student.externalId ? ` · ${student.externalId}` : ""}</p></div>{canManage ? <Button variant="outline" size="sm" onClick={() => changeMember("DELETE", student.id)}>Odebrat</Button> : null}</div>)}
            {!targetClass.students.length ? <p className="text-muted-foreground">Třída zatím nemá studenty.</p> : null}
            {message ? <p role="status" className="text-sm">{message}</p> : null}
          </CardContent>
        </Card>

        {canManage && targetClass.subjects.length > 0 && <Card><CardHeader><CardTitle>Přehled výsledků a známek</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{targetClass.subjects.map(subject=><Button key={subject.id} variant="outline" onClick={()=>router.push(`/${locale}/subjects/${subject.id}/results`)}>{subject.name} · {subject.year}</Button>)}</CardContent></Card>}

        <Card><CardHeader><CardTitle>Předměty</CardTitle></CardHeader><CardContent className="space-y-2">{targetClass.subjects.map((subject) => <button key={subject.id} type="button" onClick={() => router.push(`/${locale}/subjects/${subject.id}`)} className="flex w-full justify-between rounded border p-3 text-left hover:bg-muted"><span>{subject.name}</span><span className="text-muted-foreground">{subject.code} · {subject.year}</span></button>)}{!targetClass.subjects.length ? <p className="text-muted-foreground">Zatím bez předmětů.</p> : null}</CardContent></Card>
      </div>
    </AppShell>
  );
}