import { visibleClassScope } from "@/lib/authorization";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageClass } from "@/lib/authorization";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const targetClass = await db.class.findFirst({
    where: {
      id,
      ...visibleClassScope(session.user),
    },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      students: { include: { student: { select: { id: true, name: true, email: true, externalId: true } } }, orderBy: { joinedAt: "desc" } },
      subjects: { select: { id: true, name: true, code: true, year: true, semester: true } },
    },
  });
  if (!targetClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  return NextResponse.json({ class: targetClass });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  if (session.user.role === "STUDENT") {
    await db.classStudent.deleteMany({ where: { classId: id, studentId: session.user.id } });
    return NextResponse.json({ success: true });
  }
  if (!(await canManageClass(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.class.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}