import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizations = await db.organization.findMany({ select: { id: true, name: true, createdAt: true, _count: { select: { users: true, classes: true } } }, orderBy: [{ name: "asc" }, { id: "asc" }] });
  return NextResponse.json({ organizations }, { headers: { "Cache-Control": "no-store" } });
}
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id, name } = z.object({ id: z.string().min(1), name: z.string().trim().min(2).max(200) }).strict().parse(await req.json());
    const changed = await db.organization.updateMany({ where: { id }, data: { name } });
    if (!changed.count) return NextResponse.json({ error: "Organizace nebyla nalezena." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? "Název musí mít 2 až 200 znaků." : "Uložení organizace selhalo." }, { status: error instanceof z.ZodError ? 400 : 500 }); }
}
