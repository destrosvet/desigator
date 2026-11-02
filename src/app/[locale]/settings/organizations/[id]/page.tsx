import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OrganizationSettings } from "@/components/organization-settings";
import { Link } from "@/components/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user)) notFound();
  const { id } = await params;
  const organization = await db.organization.findUnique({ where: { id }, select: { name: true } });
  if (!organization) notFound();
  return <AppShell><div className="space-y-6">
    <Link href="/settings?section=organizations" className="text-sm text-primary underline">Zpět na všechny organizace</Link>
    <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
    <OrganizationSettings organizationId={id} title="Údaje organizace" />
  </div></AppShell>;
}
