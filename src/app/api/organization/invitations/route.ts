import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationTarget, canManageOrganization } from "@/lib/organization-access";
import { schoolRolesSchema } from "@/lib/organizations";
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const target = session ? organizationTarget(session.user, req) : null;
  if (!session || !canManageOrganization(session.user, target)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { email, roles } = z.object({ email: z.string().trim().email().toLowerCase(), roles: schoolRolesSchema }).strict().parse(await req.json());
    const token = randomBytes(32).toString("hex");
    await db.organizationInvitation.create({ data: { organizationId: target!, email, roles, tokenHash: createHash("sha256").update(token).digest("hex"), createdById: session.user.id, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    return NextResponse.json({ token, expiresInDays: 7 }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Zkontrolujte e-mail a oprávnění. Student má samostatné oprávnění." }, { status: 400 }); }
}
