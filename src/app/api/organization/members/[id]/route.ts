import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin, primaryRole, rolesOf } from "@/lib/permissions";
import { organizationTarget, canManageOrganization } from "@/lib/organization-access";
import { OrganizationError, schoolRolesSchema } from "@/lib/organizations";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const target = session ? organizationTarget(session.user, req) : null;
  if (!session || !canManageOrganization(session.user, target)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { roles } = z.object({ roles: schoolRolesSchema }).strict().parse(await req.json());
    const { id } = await params;
    await db.$transaction(async (tx) => {
      // Serialize administrator changes to preserve at least one school administrator.
      await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${target} FOR UPDATE`;
      const actor = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      if (!actor.isActive || !canManageOrganization(actor, target)) throw new OrganizationError("Oprávnění se změnila.", 403);
      const member = await tx.user.findFirst({ where: { id, organizationId: target! } });
      if (!member || (isAdmin(member) && !isAdmin(actor))) throw new OrganizationError("Účet nelze upravit.", 403);
      if (roles.includes("STUDENT") !== rolesOf(member).includes("STUDENT")) throw new OrganizationError("Změna mezi studentem a pracovníkem školy není podporována.");
      if (rolesOf(member).includes("SCHOOL_ADMIN") && !roles.includes("SCHOOL_ADMIN") && await tx.user.count({ where: { organizationId: target!, isActive: true, roles: { has: "SCHOOL_ADMIN" }, id: { not: id } } }) === 0) throw new OrganizationError("Škola musí mít alespoň jednoho správce.");
      const updatedRoles = [...(isAdmin(member) ? ["ADMIN" as const] : []), ...roles];
      await tx.user.update({ where: { id }, data: { roles: updatedRoles, role: primaryRole(updatedRoles) as "ADMIN" | "TEACHER" | "EVALUATOR" | "STUDENT" } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error instanceof OrganizationError ? error.message : "Zkontrolujte oprávnění." }, { status: error instanceof OrganizationError ? error.status : 400 }); }
}
