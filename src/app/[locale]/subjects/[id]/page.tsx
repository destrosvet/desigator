"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { ArrowLeft, Save, Trash2, Loader2, ClipboardList } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  maxPoints: number;
  status: string;
  createdAt: string;
}

interface SubjectDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  semester: string;
  year: number;
  class: { name: string };
  teacher: { name: string };
  tasks: Task[];
}

const semesterLabels: Record<string, string> = {
  FULL_YEAR: "Celoroční",
  SUMMER: "Letní semestr",
  WINTER: "Zimní semestr",
};

export default function SubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState("");

  async function fetchSubject(subjectId: string) {
    try {
      const res = await fetch(`/api/subjects/${subjectId}`);
      const data = await res.json();
      setSubject(data.subject);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    params.then(async (p) => {
      if (cancelled) return;
      setId(p.id);
      await fetchSubject(p.id);
    });
    return () => { cancelled = true; };
  }, [params]);

  const handleSave = async () => {
    if (!subject) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject),
      });
      if (res.ok) {
        fetchSubject(id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Opravdu chcete smazat tento předmět?")) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/subjects");
    } catch (error) {
      console.error(error);
    }
  };

  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER";

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!subject) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          Předmět nenalezen
        </div>
      </AppShell>
    );
  }

  const taskColumns = [
    { key: "title", label: "Název", render: (t: Task) => <span className="font-medium">{t.title}</span> },
    { key: "maxPoints", label: "Max bodů" },
    { key: "status", label: "Stav", render: (t: Task) => (
      <Badge variant={t.status === "PUBLISHED" ? "default" : "secondary"}>{t.status}</Badge>
    )},
  ];

  const taskActions = (t: Task) => [
    { label: "Otevřít", onClick: () => router.push(`/tasks/${t.id}`) },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/subjects")}>
            <ArrowLeft className="w-4 h-4 mr-2" />Zpět
          </Button>
          {canEdit && (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Uložit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />Smazat
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Detail předmětu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kód</Label>
                <Input value={subject.code} onChange={(e) => setSubject({ ...subject, code: e.target.value })} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Název</Label>
                <Input value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} disabled={!canEdit} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Popis</Label>
              <Textarea value={subject.description || ""} onChange={(e) => setSubject({ ...subject, description: e.target.value })} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Semestr</Label>
                <Select value={subject.semester} onValueChange={(v) => setSubject({ ...subject, semester: v })} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_YEAR">Celoroční</SelectItem>
                    <SelectItem value="SUMMER">Letní</SelectItem>
                    <SelectItem value="WINTER">Zimní</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rok</Label>
                <Input type="number" value={subject.year} onChange={(e) => setSubject({ ...subject, year: parseInt(e.target.value) || 2025 })} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Třída</Label>
                <Input value={subject.class?.name} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Tasky ({subject.tasks?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={subject.tasks || []}
              columns={taskColumns}
              total={subject.tasks?.length || 0}
              page={1}
              limit={subject.tasks?.length || 0}
              onSearch={() => {}}
              onPageChange={() => {}}
              onLimitChange={() => {}}
              actions={taskActions}
              onRowClick={(t) => router.push(`/tasks/${t.id}`)}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
