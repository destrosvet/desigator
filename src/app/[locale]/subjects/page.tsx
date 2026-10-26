"use client";
import type { TableSort } from "@/lib/table-sorting";
import { mutateAdminRows } from "@/lib/admin-client";


import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
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
import { Plus, BookOpen, Loader2 } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  semester: string;
  year: number;
  class: { name: string };
  teacher: { name: string };
  _count: { tasks: number };
}

const semesterLabels: Record<string, string> = {
  FULL_YEAR: "Celoroční",
  SUMMER: "Letní semestr",
  WINTER: "Zimní semestr",
};

const semesterColors: Record<string, string> = {
  FULL_YEAR: "bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-200",
  SUMMER: "bg-green-100 text-green-800 dark:bg-emerald-400/15 dark:text-emerald-200",
  WINTER: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200",
};

export default function SubjectsPage() {
  const t = useTranslations("common");
  const { data: session } = useSession();
  const router = useRouter();
  const locale = useLocale();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [total, setTotal] = useState(0);
  const fetchVersion = useRef(0);
  const [sort, setSort] = useState<TableSort>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", semester: "FULL_YEAR", year: new Date().getFullYear(), classId: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/classes?limit=999")
      .then((res) => res.json())
      .then((data) => setClasses(data.classes || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/subjects?limit=999")
      .then((res) => res.json())
      .then((data) => {
        const uniqueYears = [...new Set<number>((data.subjects || []).map((s: Subject) => s.year))].sort((a, b) => b - a);
        setYears(uniqueYears);
      })
      .catch(console.error);
  }, []);

  const fetchSubjects = useCallback(async () => {
    const version = ++fetchVersion.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (sort) { params.set("sort", sort.key); params.set("order", sort.direction); }
      if (search) params.set("search", search);
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const res = await fetch(`/api/subjects?${params}`);
      const data = await res.json();
      if (version !== fetchVersion.current) return;
      setSubjects(data.subjects || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error(error);
    } finally {
      if (version === fetchVersion.current) setLoading(false);
    }
  }, [page, limit, search, activeFilters, sort]);

  useEffect(() => {
    startTransition(() => { void fetchSubjects(); });
  }, [fetchSubjects]);

  const handleCreate = async () => {
    setCreateError("");
    if (!form.classId) {
      setCreateError("Vyberte třídu, do které předmět patří.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Vybraná třída už neexistuje nebo k ní nemáte přístup." : "Předmět se nepodařilo vytvořit.");
      }
      setDialogOpen(false);
      setForm({ name: "", description: "", semester: "FULL_YEAR", year: new Date().getFullYear(), classId: "" });
      void fetchSubjects();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Předmět se nepodařilo vytvořit.");
    } finally {
      setCreating(false);
    }
  };

  const canCreate = session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER";

  const filterConfig: FilterConfig[] = [
    {
      key: "classId",
      label: "Třída",
      type: "select",
      options: classes.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: "semester",
      label: "Semestr",
      type: "select",
      options: [
        { value: "FULL_YEAR", label: "Celoroční" },
        { value: "SUMMER", label: "Letní" },
        { value: "WINTER", label: "Zimní" },
      ],
    },
    {
      key: "year",
      label: "Rok",
      type: "select",
      options: years.map((y) => ({ value: y.toString(), label: y.toString() })),
    },
  ];

  const columns = [
    { key: "code", label: "Kód" },
    { key: "name", label: "Název", render: (s: Subject) => <span className="font-medium">{s.name}</span> },
    { key: "class", label: "Třída", render: (s: Subject) => s.class?.name },
    { key: "semester", label: "Semestr", render: (s: Subject) => (
      <Badge variant="secondary" className={semesterColors[s.semester] || ""}>{semesterLabels[s.semester] || s.semester}</Badge>
    )},
    { key: "year", label: "Rok" },
    { key: "teacher", label: "Učitel", render: (s: Subject) => s.teacher?.name },
    { key: "tasks", label: "Tasky", render: (s: Subject) => <div className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{s._count?.tasks}</div> },
  ];

  const actions = (s: Subject) => [
    { label: "Upravit", onClick: () => router.push(`/${locale}/subjects/${s.id}`) },
    { label: "Tasky", onClick: () => router.push(`/subjects/${s.id}/tasks`) },
  ];

  if (loading && subjects.length === 0) {
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
            <h1 className="text-3xl font-bold tracking-tight">Předměty</h1>
            <p className="text-muted-foreground mt-1">Správa předmětů a semestrů</p>
          </div>
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setCreateError(""); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Nový předmět</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nový předmět</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Název</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Popis</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="subject-class">Třída</Label>
                    <Select value={form.classId} onValueChange={(classId) => { setForm({ ...form, classId }); setCreateError(""); }} disabled={!classes.length}>
                      <SelectTrigger id="subject-class"><SelectValue placeholder="Vyberte třídu" /></SelectTrigger>
                      <SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {!classes.length && <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Nejdřív je potřeba založit třídu. <button type="button" className="font-medium text-primary underline" onClick={() => router.push(`/${locale}/classes`)}>Přejít ke třídám</button></div>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Semestr</Label>
                      <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL_YEAR">Celoroční</SelectItem>
                          <SelectItem value="SUMMER">Letní</SelectItem>
                          <SelectItem value="WINTER">Zimní</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Rok</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 2025 })} /></div>
                  </div>
                  {createError && <p role="alert" className="text-sm text-destructive">{createError}</p>}
                  <Button onClick={handleCreate} disabled={creating || !form.name.trim() || !form.classId} className="w-full">
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{t("create")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <DataTable tableId="subjects" sort={sort} onSortChange={setSort}
              onDeleteRows={canCreate ? async (ids) => { await mutateAdminRows("subjects", ids); await fetchSubjects(); } : undefined}
              data={subjects}
              columns={columns}
              total={total}
              page={page}
              limit={limit}
              onSearch={setSearch}
              onPageChange={setPage}
              onLimitChange={setLimit}
              actions={actions}
              onRowClick={(s) => router.push(`/subjects/${s.id}`)}
              searchPlaceholder="Vyhledat předmět..."
              filters={filterConfig}
              onFiltersChange={setActiveFilters}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
