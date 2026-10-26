import { visibleClassScope } from "@/lib/authorization";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClassDetailClient } from "./class-detail-client";

export default async function ClassDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/login`);

  const targetClass = await db.class.findFirst({
    where: {
      id,
      ...visibleClassScope(session.user),
    },
    include: {
      teacher: { select: { name: true, email: true } },
      students: { include: { student: { select: { id: true, name: true, email: true, externalId: true } } }, orderBy: { joinedAt: "desc" } },
      subjectLinks: { select: { subject: { select: { id: true, name: true, code: true, year: true, semester: true } } } },
    },
  });
  if (!targetClass) notFound();

  const candidates = session.user.role === "STUDENT" ? [] : await db.user.findMany({
    where: { role: "STUDENT", organizationId: targetClass.organizationId, isActive: true, classMemberships: { none: { classId: id } } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  return <ClassDetailClient locale={locale} role={session.user.role} targetClass={JSON.parse(JSON.stringify({ ...targetClass, subjects: targetClass.subjectLinks.map((link) => link.subject) }))} candidates={candidates} />;
}