import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageClass } from "@/lib/authorization";
import { db } from "@/lib/db";

const schema = z.object({ studentId: z.string().min(1) });

async function authorize(classId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!(await canManageClass(session.user, classId))) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.response) return auth.response;

  try {
    const { studentId } = schema.parse(await req.json());
    const targetClass = await db.class.findUniqueOrThrow({ where: { id }, select: { organizationId: true } });
    const student = await db.user.findFirst({ where: { id: studentId, organizationId: targetClass.organizationId, role: "STUDENT", isActive: true }, select: { id: true } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    const membership = await db.classStudent.upsert({
      where: { classId_studentId: { classId: id, studentId } },
      update: {},
      create: { classId: id, studentId },
    });
    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Failed to add student" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.response) return auth.response;

  const { studentId } = schema.parse(await req.json());
  await db.classStudent.deleteMany({ where: { classId: id, studentId } });
  return NextResponse.json({ success: true });
}