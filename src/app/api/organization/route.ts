import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin, primaryRole, rolesOf, hasSchoolMembership, canCreateOrganization } from "@/lib/permissions";
import { organizationTarget, canManageOrganization } from "@/lib/organization-access";
import { OrganizationError } from "@/lib/organizations";
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const target = organizationTarget(session.user, req);
  if (new URL(req.url).searchParams.has("organizationId") && !target) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const canManage = canManageOrganization(session.user, target);
  const query = new URL(req.url).searchParams;
  const page = Math.max(1, Math.floor(Number(query.get("page")) || 1));
  const limit = Math.min(100, Math.max(10, Math.floor(Number(query.get("limit")) || 20)));
  const search = (query.get("search") || "").trim().slice(0, 200);
  const where = { organizationId: target!, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } : {}) };
  const [organization, members, total] = await Promise.all([
    target ? db.organization.findUnique({ where: { id: target }, select: { id: true, name: true, gradingScale: true } }) : null,
    target && canManage ? db.user.findMany({ where, select: { id: true, name: true, email: true, role: true, roles: true }, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit }) : [],
    target && canManage ? db.user.count({ where }) : 0,
  ]);
  return NextResponse.json({ organization, members, total, page, limit, canManage, canCreate: canCreateOrganization(session.user), roles: organization?.id === session.user.organizationId && hasSchoolMembership(session.user) ? rolesOf(session.user).filter((role) => role !== "ADMIN") : [] }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateOrganization(session.user)) return NextResponse.json({ error: "Založení školy vyžaduje schválené oprávnění učitele nebo správce školy. Podejte žádost v Nastavení → Oprávnění." }, { status: 403 });
  try {
    const { name } = z.object({ name: z.string().trim().min(2).max(200) }).strict().parse(await req.json());
    const organization = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${session.user.id} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      if (!user.isActive || !user.emailVerifiedAt || !canCreateOrganization(user)) throw new OrganizationError("Nemáte schválené oprávnění k založení školy.", 403);
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
