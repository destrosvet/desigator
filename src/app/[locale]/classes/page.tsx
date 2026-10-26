import { visibleClassScope } from "@/lib/authorization";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClassesClient } from "./classes-client";
import { isAdmin } from "@/lib/permissions";

export default async function ClassesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/login`);

  const classes = await db.class.findMany({
    where: visibleClassScope(session.user),
    include: {
      teacher: { select: { name: true } },
      _count: { select: { students: true, subjects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const organizations = isAdmin(session.user) ? await db.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];

  return <ClassesClient locale={locale} role={session.user.role} classes={classes} organizations={organizations} defaultOrganizationId={session.user.organizationId || ""} />;
}
