"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { StudentList } from "@/components/student-list";

export default function StudentsPage() {
  const t = useTranslations("students");
  return <AppShell><div className="space-y-6"><h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1><StudentList /></div></AppShell>;
}
