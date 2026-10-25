import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { studentScope } from "@/lib/admin-records";
const schema = z.object({ name: z.string().trim().min(1).max(200), email: z.string().trim().email(), externalId: z.string().trim().regex(/^[a-z0-9]+$/i, "Školní ID smí obsahovat jen písmena a čísla.").max(100).nullable() });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const data = schema.parse(await req.json());
    if (data.externalId) data.externalId = data.externalId.toUpperCase();
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
      const student = await tx.user.findFirst({ where: { AND: [studentScope(session.user), { id }] }, select: { id: true } });
      if (!student) return null;
      return tx.user.update({ where: { id }, data, select: { id: true, name: true, email: true, externalId: true } });
    });
    if (!result) return NextResponse.json({ error: "Student není ve vašem oprávněném rozsahu." }, { status: 403 });
    return NextResponse.json({ student: result });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Úprava selhala. E-mail nebo školní ID už může být použité." }, { status: 409 });
  }
}
