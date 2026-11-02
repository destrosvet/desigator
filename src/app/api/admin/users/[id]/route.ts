import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailSchema } from "@/lib/password-policy";
import { isAdmin, primaryRole, rolesOf } from "@/lib/permissions";
import { OrganizationError } from "@/lib/organizations";
import type { UserRole } from "@prisma/client";

const schema = z.object({
  name: z.string().trim().min(2).max(200), email: emailSchema,
  institution: z.string().trim().max(200).nullable(),
  externalId: z.string().trim().max(200).nullable(),
  roles: z.array(z.enum(["ADMIN", "SCHOOL_ADMIN", "TEACHER", "EVALUATOR", "STUDENT"])).min(1).max(5)
    .transform((roles) => [...new Set(roles)])
    .refine((roles) => !roles.includes("STUDENT") || roles.length === 1, "Studenta nelze kombinovat s dalšími rolemi."),
  isActive: z.boolean(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const input = schema.parse(await req.json());
    const { id } = await params;
    await db.$transaction(async (tx) => {
      // Serialize platform administrator edits, including concurrent deactivations.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(194728103)`;
      const actor = await tx.user.findUnique({ where: { id: session.user.id } });
      if (!actor?.isActive || !isAdmin(actor)) throw new OrganizationError("Oprávnění se změnila.", 403);
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new OrganizationError("Uživatel nebyl nalezen.", 404);
      if (user.organizationId) await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${user.organizationId} FOR UPDATE`;
      if (id === actor.id && (!input.isActive || !input.roles.includes("ADMIN"))) throw new OrganizationError("Vlastní účet nelze deaktivovat ani mu odebrat správu platformy.");
      if (!user.organizationId && input.roles.some((role) => ["SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(role))) throw new OrganizationError("Tato oprávnění vyžadují členství v organizaci.");
      if (input.roles.includes("STUDENT") !== rolesOf(user).includes("STUDENT")) throw new OrganizationError("Změna mezi studentem a pracovníkem školy není podporována.");
      if (user.organizationId && rolesOf(user).includes("SCHOOL_ADMIN") && (!input.isActive || !input.roles.includes("SCHOOL_ADMIN"))) {
        const other = await tx.user.count({ where: { organizationId: user.organizationId, id: { not: id }, isActive: true, roles: { has: "SCHOOL_ADMIN" } } });
        if (!other) throw new OrganizationError("Škola musí mít alespoň jednoho aktivního správce.");
      }
      await tx.user.update({ where: { id }, data: {
        ...input, institution: input.institution || null, externalId: input.externalId || null,
        role: primaryRole(input.roles) as UserRole,
        ...(!input.isActive && user.isActive ? { sessionVersion: { increment: 1 } } : {}),
      } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof OrganizationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Neplatné údaje." }, { status: 400 });
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "E-mail nebo školní ID již používá jiný účet." }, { status: 409 });
    return NextResponse.json({ error: "Uložení uživatele selhalo." }, { status: 500 });
  }
}
