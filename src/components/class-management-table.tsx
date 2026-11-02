"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { manageTableRows } from "@/lib/table-management";

type ClassRow = { id: string; name: string; code: string; description: string | null; academicYear: number | null; isActive: boolean; teacher: { name: string }; _count: { students: number; subjects: number } };
export function ClassManagementTable({ classes, canManage, locale }: { classes: ClassRow[]; canManage: boolean; locale: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const rows = classes.filter((row) => `${row.name} ${row.teacher.name} ${row.code}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)));
  return <DataTable tableId="classes" clientPagination data={rows} total={rows.length} page={page} limit={limit} onSearch={setSearch} onPageChange={setPage} onLimitChange={setLimit} onRowClick={(row) => router.push(`/${locale}/classes/${row.id}`)}
    management={canManage ? { entity: "classes", fields: [{ key: "name", label: "Název" }, { key: "description", label: "Popis" }, { key: "academicYear", label: "Akademický rok", type: "number" }, { key: "isActive", label: "Stav třídy", type: "boolean" }], onSaved: () => router.refresh() } : undefined}
    onDeleteRows={canManage ? async (ids) => { await manageTableRows("classes", ids); router.refresh(); } : undefined}
    columns={[{ key: "name", label: "Třída" }, { key: "code", label: "Kód pro připojení" }, { key: "teacher", label: "Učitel", sortValue: (row: ClassRow) => row.teacher.name, render: (row: ClassRow) => row.teacher.name }, { key: "academicYear", label: "Akademický rok", render: (row: ClassRow) => row.academicYear ? `${row.academicYear}/${row.academicYear + 1}` : "—" }, { key: "students", label: "Studenti", sortValue: (row: ClassRow) => row._count.students, render: (row: ClassRow) => row._count.students }, { key: "subjects", label: "Předměty", sortValue: (row: ClassRow) => row._count.subjects, render: (row: ClassRow) => row._count.subjects }, { key: "isActive", label: "Stav", render: (row: ClassRow) => row.isActive ? "Aktivní" : "Archivováno" }]} />;
}
