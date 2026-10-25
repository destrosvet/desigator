import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrganizationError } from "@/lib/organizations";
import { primaryRole, rolesOf } from "@/lib/permissions";
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nejdříve se přihlaste účtem, na který byla pozvánka vystavena." }, { status: 401 });
  try {
    const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(await req.json());
    const organization = await db.$transaction(async (tx) => {
      // Same lock order as member updates; invitations cannot race membership changes.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${session.user.id} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      const invitation = await tx.organizationInvitation.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") }, include: { organization: { select: { id: true, name: true } } } });
      if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date() || invitation.email.toLowerCase() !== user.email.toLowerCase()) throw new OrganizationError("Pozvánka je neplatná, použitá, vypršela nebo patří jinému účtu.", 403);
      if (user.organizationId && user.organizationId !== invitation.organizationId) throw new OrganizationError("Už patříte do jiné školy. Hodnocení napříč školami se přiděluje u konkrétní práce.");
      if (user.organizationId === invitation.organizationId) throw new OrganizationError("Už jste členem této školy. Oprávnění upraví její správce.");
      if (await tx.submission.count({ where: { studentId: user.id } }) || await tx.classStudent.count({ where: { studentId: user.id } })) throw new OrganizationError("Účet má studentskou historii v jiné škole.");
      const claimed = await tx.organizationInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (claimed.count !== 1) throw new OrganizationError("Pozvánka už byla použita.");
      const roles = [...new Set([...(rolesOf(user).includes("ADMIN") ? ["ADMIN" as const] : []), ...invitation.roles])];
      await tx.user.update({ where: { id: user.id }, data: { organizationId: invitation.organizationId, roles, role: primaryRole(roles) as "ADMIN" | "TEACHER" | "EVALUATOR" | "STUDENT" } });
      return invitation.organization;
    });
    return NextResponse.json({ organization });
  } catch (error) { return NextResponse.json({ error: error instanceof OrganizationError ? error.message : "Pozvánku se nepodařilo přijmout." }, { status: error instanceof OrganizationError ? error.status : 400 }); }
}
