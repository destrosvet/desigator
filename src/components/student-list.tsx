"use client";
import type { TableSort } from "@/lib/table-sorting";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { StudentTransferDialog, type TransferGroup } from "@/components/student-transfer-dialog";
import { canTeach } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentEditor } from "@/components/student-editor";
import { mutateAdminRows } from "@/lib/admin-client";
import { DataTable } from "@/components/data-table";
import { FilterConfig } from "@/components/data-filters";
import { Loader2 } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  externalId: string | null;
  classMemberships: { classId: string; class: { id: string; name: string } }[];
}

export function StudentList({ fixedClassId, fixedClassName, refreshVersion = 0 }: { fixedClassId?: string; fixedClassName?: string; refreshVersion?: number }) {
  const { data: session } = useSession();
  const router = useRouter();
  const transferText = useTranslations("studentTransfer");
  const [transfer, setTransfer] = useState<{ students: Student[]; sourceGroups: TransferGroup[] } | null>(null);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");

  const [editing, setEditing] = useState<Student | null>(null);
  const canManage = Boolean(session?.user && canTeach(session.user));
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const fetchVersion = useRef(0);
  const [sort, setSort] = useState<TableSort>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState<ClassOption[]>([]);

  useEffect(() => {
    if (fixedClassId) return;
    fetch("/api/classes?limit=999")
      .then((res) => res.json())
      .then((data) => setClasses(data.classes || []))
      .catch(console.error);
  }, [fixedClassId]);

  const fetchStudents = useCallback(async () => {
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
      if (fixedClassId) params.set("classId", fixedClassId);
      const res = await fetch(`/api/students?${params}`);
      const data = await res.json();
      if (version !== fetchVersion.current) return;
      setStudents(data.students || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error(error);
    } finally {
      if (version === fetchVersion.current) setLoading(false);
    }
  }, [page, limit, search, activeFilters, sort, fixedClassId, refreshVersion]);

  useEffect(() => {
    startTransition(() => { void fetchStudents(); });
  }, [fetchStudents]);

  function openTransfer(ids: string[]) {
    const selected = students.filter(student => ids.includes(student.id));
    const sourceClassId = fixedClassId || activeFilters.classId;
    const sources = sourceClassId ? [{ id: sourceClassId, name: fixedClassName || classes.find(group => group.id === sourceClassId)?.name || sourceClassId }] : (selected[0]?.classMemberships || []).filter(membership => selected.every(student => student.classMemberships.some(item => item.classId === membership.classId))).map(membership => ({ id: membership.classId, name: membership.class.name }));
    setTransfer({ students: selected, sourceGroups: sources });
  }

  const filterConfig: FilterConfig[] = fixedClassId ? [] : [
    {
      key: "classId",
      label: "Třída",
      type: "select",
      options: classes.map((c) => ({ value: c.id, label: c.name })),
    },
  ];

  const columns = [
    { key: "name", label: "Jméno", render: (s: Student) => <span className="font-medium">{s.name}</span> },
    { key: "email", label: "E-mail" },
    { key: "externalId", label: "Školní ID", render: (s: Student) => s.externalId || "-" },
    { key: "classes", label: "Třídy", render: (s: Student) => (
      <div className="flex flex-wrap gap-1">
        {s.classMemberships?.map((cm, i) => (
          <Badge key={i} variant="secondary">{cm.class?.name}</Badge>
        )) || "-"}
      </div>
    )},
  ];

  const actions = (s: Student) => [
    { label: "Upravit", onClick: () => setEditing(s) },
    { label: transferText("action"), onClick: () => openTransfer([s.id]) },
  ];

  if (loading && students.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      {editing ? <StudentEditor key={editing.id} student={editing} onClose={() => setEditing(null)} onSaved={fetchStudents} /> : null}
      {transfer ? <StudentTransferDialog students={transfer.students} sourceGroups={transfer.sourceGroups} onClose={() => setTransfer(null)} onSaved={async () => { await fetchStudents(); setRevision(value => value + 1); setMessage(transferText("success", { count: transfer.students.length })); if (fixedClassId) router.refresh(); }} /> : null}
      <div className="space-y-6">
        {message ? <p role="status" className="text-sm">{message}</p> : null}
        <Card>
          <CardContent className="pt-6">
            <DataTable selectionVersion={revision} tableId="students" sort={sort} onSortChange={setSort}
              data={students}
              columns={columns}
              total={total}
              page={page}
              limit={limit}
              onSearch={setSearch}
              onPageChange={setPage}
              onLimitChange={setLimit}
              actions={canManage ? actions : undefined}
              selectionActions={canManage ? [{ label: transferText("action"), onSelect: openTransfer }] : undefined}
              onRowClick={canManage ? (s) => setEditing(s) : undefined}
              membershipRemoval={Boolean(fixedClassId)}
              onDeleteRows={canManage ? async (ids) => {
                if (fixedClassId) {
                  const response = await fetch("/api/classes/" + fixedClassId + "/students", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentIds: ids }) });
                  if (!response.ok) throw new Error("Odebrání ze třídy selhalo.");
                } else await mutateAdminRows("students", ids);
                await fetchStudents();
                if (fixedClassId) router.refresh();
              } : undefined}
              searchPlaceholder="Vyhledat studenta..."
              filters={filterConfig}
              onFiltersChange={setActiveFilters}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
