import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { UserDetail } from "@/components/user-detail";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canTeach, isAdmin, rolesOf } from "@/lib/permissions";
import { studentScope } from "@/lib/admin-records";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !canTeach(session.user)) notFound();
  const { id } = await params;
  const admin = isAdmin(session.user);
  if (!admin && !await db.user.findFirst({ where: { AND: [{ id }, studentScope(session.user)] }, select: { id: true } })) notFound();
  const user = await db.user.findUnique({ where: { id }, select: {
    id: true, name: true, email: true, institution: true, externalId: true,
    role: true, roles: true, isActive: true, organizationId: true,
    organization: { select: { name: true } }, createdAt: true, updatedAt: true,
    _count: { select: { taughtClasses: true, classMemberships: true, createdSubjects: true, createdTasks: true, submissions: true, evaluations: true } },
  } });
  if (!user) notFound();
  const organizations = admin ? await db.organization.findMany({ select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }) : [];
  return <AppShell><UserDetail user={{ ...user, roles: rolesOf(user), createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() }} self={id === session.user.id} admin={admin} organizations={organizations} /></AppShell>;
}
