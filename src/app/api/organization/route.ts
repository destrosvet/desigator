import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin, primaryRole, rolesOf, hasSchoolMembership } from "@/lib/permissions";
import { organizationTarget, canManageOrganization } from "@/lib/organization-access";
import { OrganizationError } from "@/lib/organizations";
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const target = organizationTarget(session.user, req);
  if (new URL(req.url).searchParams.has("organizationId") && !target) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organization = target ? await db.organization.findUnique({ where: { id: target }, select: { id: true, name: true, gradingScale: true } }) : null;
  const canManage = canManageOrganization(session.user, target);
  const members = organization && canManage ? await db.user.findMany({ where: { organizationId: organization.id }, select: { id: true, name: true, email: true, role: true, roles: true }, orderBy: { name: "asc" }, take: 1000 }) : [];
  return NextResponse.json({ organization, members, canManage, roles: organization?.id === session.user.organizationId && hasSchoolMembership(session.user) ? rolesOf(session.user).filter((role) => role !== "ADMIN") : [] }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isAdmin(session.user) && !hasSchoolMembership(session.user)) return NextResponse.json({ error: "Správce platformy spravuje školy v přehledu Organizace. Školní působení získá samostatnou pozvánkou." }, { status: 403 });
  try {
    const { name } = z.object({ name: z.string().trim().min(2).max(200) }).strict().parse(await req.json());
    const organization = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${session.user.id} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      if (user.organizationId) throw new OrganizationError("Už patříte do školy. Účet může mít jednu domovskou školu.");
      // Existing student work must stay attached to its original school.
      if (await tx.submission.count({ where: { studentId: user.id } }) || await tx.classStudent.count({ where: { studentId: user.id } })) throw new OrganizationError("Účet již má studentskou historii. Založení školy vyžaduje samostatný účet.");
      const created = await tx.organization.create({ data: { name } });
      const roles = [...(rolesOf(user).includes("ADMIN") ? ["ADMIN" as const] : []), "SCHOOL_ADMIN" as const, "TEACHER" as const, "EVALUATOR" as const];
      await tx.user.update({ where: { id: user.id }, data: { organizationId: created.id, roles, role: primaryRole(roles) as "ADMIN" | "TEACHER" } });
      return created;
    });
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0].message : error instanceof OrganizationError ? error.message : "Školu se nepodařilo založit." }, { status: error instanceof z.ZodError ? 400 : error instanceof OrganizationError ? error.status : 500 }); }
}
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const target = session ? organizationTarget(session.user, req) : null;
  if (!session || !canManageOrganization(session.user, target)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { name } = z.object({ name: z.string().trim().min(2).max(200) }).strict().parse(await req.json());
    const organization = await db.organization.update({ where: { id: target! }, data: { name }, select: { id: true, name: true } });
    return NextResponse.json({ organization });
  } catch { return NextResponse.json({ error: "Zkontrolujte název školy." }, { status: 400 }); }
}
