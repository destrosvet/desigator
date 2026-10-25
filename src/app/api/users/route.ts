import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const allowedRole = z.enum(["TEACHER", "EVALUATOR"]);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = allowedRole.safeParse(new URL(req.url).searchParams.get("role"));
  if (!parsed.success) return NextResponse.json({ error: "Unsupported role" }, { status: 400 });

  const users = await db.user.findMany({
    where: { isActive: true, ...(parsed.data === "TEACHER" ? { organizationId: session.user.organizationId || "__no_organization__" } : {}), OR: [{ roles: { has: parsed.data } }, { roles: { isEmpty: true }, role: parsed.data }] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 500,
  });
  return NextResponse.json({ users });
}