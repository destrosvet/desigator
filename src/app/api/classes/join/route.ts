import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ code: z.string().trim().min(4).max(32).transform((value) => value.toUpperCase()) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { code } = schema.parse(await req.json());
    const targetClass = await db.class.findFirst({ where: { code, isActive: true }, select: { id: true, name: true, organizationId: true } });
    if (!targetClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    if (!session.user.organizationId || targetClass.organizationId !== session.user.organizationId) return NextResponse.json({ error: "Nejdříve přijměte pozvánku do této školy." }, { status: 403 });
    await db.classStudent.upsert({
      where: { classId_studentId: { classId: targetClass.id, studentId: session.user.id } },
      update: {},
      create: { classId: targetClass.id, studentId: session.user.id },
    });
    return NextResponse.json({ class: targetClass }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Failed to join class" }, { status: 500 });
  }
}