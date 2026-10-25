import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function owner() {
  const session = await getServerSession(authOptions);
  return session && ["TEACHER", "ADMIN"].includes(session.user.role) ? session.user : null;
}
export async function GET() {
  const user = await owner();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const profile = await db.user.findUnique({ where: { id: user.id }, select: { institution: true } });
  if (!profile) return NextResponse.json({ error: "Profil nebyl nalezen." }, { status: 404 });
  return NextResponse.json({ profile });
}
export async function PATCH(req: Request) {
  const user = await owner();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const data = z.object({ institution: z.string().trim().max(300, "Název instituce může mít nejvýše 300 znaků.") }).strict().parse(await req.json());
    const profile = await db.user.update({ where: { id: user.id }, data: { institution: data.institution || null }, select: { institution: true } });
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0].message : "Uložení profilu selhalo." }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
