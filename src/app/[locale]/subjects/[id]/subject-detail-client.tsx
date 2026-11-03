"use client";

import { useState } from "react";
import { SubjectEvaluators, type SubjectEvaluator } from "@/components/subject-evaluators";
import { mutateAdminRows } from "@/lib/admin-client";
import { useLocale } from "next-intl";
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
  canManage: boolean;
  id: string;
  title: string;
  maxPoints: number;
  status: string;
  createdAt: string;
}

interface ClassOption { id: string; name: string }

interface SubjectDetail {
  assignedEvaluators: SubjectEvaluator[];
  canManage: boolean;
  id: string;
  code: string;
  name: string;
  description: string | null;
  semester: string;
  year: number;
  classes: { classId: string; class: { id: string; name: string } }[];
  teacher: { name: string };
  tasks: Task[];
}

export default function SubjectDetailClient({ initialSubject, classes }: { initialSubject: SubjectDetail; classes: ClassOption[] }) {
  const router = useRouter();
  const locale = useLocale();
  const [taskSearch, setTaskSearch] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [taskLimit, setTaskLimit] = useState(20);
  const [subject, setSubject] = useState<SubjectDetail>(initialSubject);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const id = subject.id;

  async function fetchSubject(subjectId: string) {
    try {
      const res = await fetch(`/api/subjects/${subjectId}`);
      if (!res.ok) throw new Error("Předmět se nepodařilo načíst.");
      const data = await res.json();
      setSubject(data.subject);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Načtení selhalo.");
    }
  };

  const handleSave = async () => {
    if (!subject) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subject, classIds: subject.classes.map((item) => item.classId) }),
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
    if (!confirm("Opravdu smazat tento předmět? Předmět s navázanými zadáními nelze smazat.")) return;
    try { await mutateAdminRows("subjects", [id]); router.push(`/${locale}/subjects`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Smazání selhalo."); }
  };

  const canEdit = Boolean(subject?.canManage);

  const filteredTasks = subject.tasks.filter((task) => task.title.toLocaleLowerCase().includes(taskSearch.toLocaleLowerCase()));
  const taskColumns = [
    { key: "title", label: "Název", render: (t: Task) => <span className="font-medium">{t.title}</span> },
    { key: "maxPoints", label: "Max bodů" },
    { key: "status", label: "Stav", render: (t: Task) => (
      <Badge variant={t.status === "PUBLISHED" ? "default" : "secondary"}>{t.status}</Badge>
    )},
  ];

  const taskActions = (t: Task) => [
    { label: "Otevřít", onClick: () => router.push(`/${locale}/tasks/${t.id}`) },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {message ? <p role="alert" className="text-destructive">{message}</p> : null}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push(`/${locale}/subjects`)}>
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

        <Button variant="outline" onClick={() => router.push(`/${locale}/subjects/${id}/results`)}><ClipboardList className="size-4" />Přehled výsledků a známek</Button>

        {canEdit ? <SubjectEvaluators subjectId={id} initialAssigned={subject.assignedEvaluators} /> : null}
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
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Studijní skupiny</legend>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                  {classes.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!canEdit} checked={subject.classes.some((link) => link.classId === item.id)} onChange={(event) => setSubject({ ...subject, classes: event.target.checked ? [...subject.classes, { classId: item.id, class: item }] : subject.classes.filter((link) => link.classId !== item.id) })} />{item.name}</label>)}
                </div>
              </fieldset>
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
            <DataTable onEditRow={canEdit ? (row) => router.push(`/${locale}/tasks/${row.id}`) : undefined} bulkActions={canEdit ? [{ label: "Publikovat vybrané", onApply: async (ids) => { await mutateAdminRows("tasks", ids, "PUBLISHED"); await fetchSubject(id); } }, { label: "Uzavřít vybrané", onApply: async (ids) => { await mutateAdminRows("tasks", ids, "CLOSED"); await fetchSubject(id); } }, { label: "Vrátit do konceptu", onApply: async (ids) => { await mutateAdminRows("tasks", ids, "DRAFT"); await fetchSubject(id); } }] : undefined} canManageRow={(row) => row.canManage} tableId="subject-tasks" clientPagination
              onDeleteRows={canEdit ? async (ids) => { await mutateAdminRows("tasks", ids); await fetchSubject(id); } : undefined}
              data={filteredTasks}
              columns={taskColumns}
              total={filteredTasks.length}
              page={taskPage}
              limit={taskLimit}
              onSearch={setTaskSearch}
              onPageChange={setTaskPage}
              onLimitChange={setTaskLimit}
              actions={taskActions}
              onRowClick={(t) => router.push(`/${locale}/tasks/${t.id}`)}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
