"use client";

import { startTransition, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { FilterConfig } from "@/components/data-filters";
import { Plus, Copy, Loader2, ClipboardList } from "lucide-react";

interface SubjectOption {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  maxPoints: number;
  status: string;
  deadline: string | null;
  creator: { name: string } | null;
  subject: { name: string };
  _count: { submissions: number };
}

export default function TasksPage() {
  const t = useTranslations("tasks");
  const common = useTranslations("common");
  const { data: session } = useSession();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", instructions: "", maxPoints: 100, subjectId: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  useEffect(() => {
    fetch("/api/subjects?limit=999")
      .then((res) => res.json())
      .then((data) => setSubjects(data.subjects || []))
      .catch(console.error);
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search) params.set("search", search);
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => { void fetchTasks(); });
  }, [page, limit, search, activeFilters]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ title: "", description: "", instructions: "", maxPoints: 100, subjectId: "" });
        fetchTasks();
      } else {
        const result = await res.json();
        setCreateError(result.error || "Zadání se nepodařilo vytvořit.");
      }
    } catch (error) {
      setCreateError("Zadání se nepodařilo vytvořit. Zkuste to znovu.");
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/duplicate`, { method: "POST" });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const canCreate = session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER";

  const uniqueSubjectNames = [...new Set(subjects.map((s) => s.name))].sort();

  const filterConfig: FilterConfig[] = [
    {
      key: "subjectName",
      label: "Předmět",
      type: "select",
      options: uniqueSubjectNames.map((name) => ({ value: name, label: name })),
    },
    {
      key: "status",
      label: "Stav",
      type: "select",
      options: [
        { value: "PUBLISHED", label: "Publikováno" },
        { value: "DRAFT", label: "Koncept" },
      ],
    },
  ];

  const columns = [
    { key: "title", label: "Název", render: (t: Task) => <span className="font-medium">{t.title}</span> },
    { key: "subject", label: "Předmět", render: (t: Task) => t.subject?.name },
    { key: "maxPoints", label: "Max bodů" },
    { key: "status", label: "Stav", render: (t: Task) => (
      <Badge variant={t.status === "PUBLISHED" ? "default" : "secondary"}>{t.status}</Badge>
    )},
    { key: "submissions", label: "Odevzdání", render: (t: Task) => <div className="flex items-center gap-1"><ClipboardList className="w-4 h-4" />{t._count?.submissions}</div> },
  ];

  const actions = (task: Task) => {
    const items = [{ label: "Upravit", onClick: () => router.push(`/tasks/${task.id}`) }];
    if (canCreate) items.push({ label: "Duplikovat", onClick: () => handleDuplicate(task.id) });
    return items;
  };

  if (loading && tasks.length === 0) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">Správa zadání a úkolů</p>
          </div>
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />{t("create")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("create")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="task-subject">Předmět</Label><Select value={form.subjectId} onValueChange={(subjectId) => setForm({ ...form, subjectId })}><SelectTrigger id="task-subject"><SelectValue placeholder="Vyberte předmět" /></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Název</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Popis</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Instrukce</Label><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Max bodů</Label><Input type="number" value={form.maxPoints} onChange={(e) => setForm({ ...form, maxPoints: parseInt(e.target.value) || 100 })} /></div>
                  {createError ? <p role="alert" className="text-sm text-destructive">{createError}</p> : null}
                  <Button onClick={handleCreate} disabled={creating || !form.title.trim() || !form.subjectId} className="w-full">
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{common("create")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <DataTable
              data={tasks}
              columns={columns}
              total={total}
              page={page}
              limit={limit}
              onSearch={setSearch}
              onPageChange={setPage}
              onLimitChange={setLimit}
              actions={actions}
              onRowClick={(t) => router.push(`/tasks/${t.id}`)}
              searchPlaceholder="Vyhledat task..."
              filters={filterConfig}
              onFiltersChange={setActiveFilters}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
