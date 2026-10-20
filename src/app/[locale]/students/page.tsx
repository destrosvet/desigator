"use client";

import { startTransition, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { FilterConfig } from "@/components/data-filters";
import { Loader2, Users } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  externalId: string | null;
  classMemberships: { class: { name: string } }[];
}

export default function StudentsPage() {
  const t = useTranslations("students");
  const { data: session } = useSession();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState<ClassOption[]>([]);

  useEffect(() => {
    fetch("/api/classes?limit=999")
      .then((res) => res.json())
      .then((data) => setClasses(data.classes || []))
      .catch(console.error);
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search) params.set("search", search);
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const res = await fetch(`/api/students?${params}`);
      const data = await res.json();
      setStudents(data.students || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => { void fetchStudents(); });
  }, [page, limit, search, activeFilters]);

  const filterConfig: FilterConfig[] = [
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
    { key: "externalId", label: "External ID", render: (s: Student) => s.externalId || "-" },
    { key: "classes", label: "Třídy", render: (s: Student) => (
      <div className="flex flex-wrap gap-1">
        {s.classMemberships?.map((cm, i) => (
          <Badge key={i} variant="secondary">{cm.class?.name}</Badge>
        )) || "-"}
      </div>
    )},
  ];

  const actions = (s: Student) => [
    { label: "Detail", onClick: () => router.push(`/students/${s.id}`) },
  ];

  if (loading && students.length === 0) {
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
            <p className="text-muted-foreground mt-1">Seznam studentů</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <DataTable
              data={students}
              columns={columns}
              total={total}
              page={page}
              limit={limit}
              onSearch={setSearch}
              onPageChange={setPage}
              onLimitChange={setLimit}
              actions={actions}
              onRowClick={(s) => router.push(`/students/${s.id}`)}
              searchPlaceholder="Vyhledat studenta..."
              filters={filterConfig}
              onFiltersChange={setActiveFilters}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
