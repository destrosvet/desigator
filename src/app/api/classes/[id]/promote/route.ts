import { randomBytes } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageClass } from "@/lib/authorization";
import { db } from "@/lib/db";

const schema = z.object({ name: z.string().trim().min(1).max(200), academicYear: z.number().int().min(2000).max(2100) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageClass(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Zkontrolujte název a akademický rok nové skupiny." }, { status: 400 });
  const source = await db.class.findUnique({ where: { id }, select: { organizationId: true, teacherId: true, description: true, students: { select: { studentId: true } } } });
  if (!source) return NextResponse.json({ error: "Studijní skupina neexistuje." }, { status: 404 });
  const created = await db.$transaction(async (tx) => {
    const next = await tx.class.create({ data: { name: parsed.data.name, academicYear: parsed.data.academicYear, description: source.description, organizationId: source.organizationId, teacherId: source.teacherId, code: randomBytes(5).toString("hex").toUpperCase() } });
    if (source.students.length) await tx.classStudent.createMany({ data: source.students.map(({ studentId }) => ({ classId: next.id, studentId })), skipDuplicates: true });
    return next;
  });
  return NextResponse.json({ class: created, copiedStudents: source.students.length }, { status: 201 });
}