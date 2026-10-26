import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { managedClassScope } from "@/lib/authorization";
import { canTeach } from "@/lib/permissions";
import { db } from "@/lib/db";

const schema = z.object({
  targetClassId: z.string().trim().min(1),
  studentIds: z.array(z.string().trim().min(1)).min(1).max(200)
    .refine((ids) => new Set(ids).size === ids.length, "duplicateStudents"),
}).strict();

class TransferError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (!canTeach(session.user)) return json({ error: "forbidden" }, 403);
  const { id } = await params;
  const source = await db.class.findFirst({ where: { AND: [{ id, isActive: true }, managedClassScope(session.user)] }, select: { organizationId: true } });
  if (!source) return json({ error: "forbidden" }, 403);
  const classes = await db.class.findMany({
    where: { AND: [{ id: { not: id }, organizationId: source.organizationId, isActive: true }, managedClassScope(session.user)] },
    select: { id: true, name: true, code: true }, orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return json({ classes });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (!canTeach(session.user)) return json({ error: "forbidden" }, 403);
  const { id } = await params;
  try {
    const { targetClassId, studentIds } = schema.parse(await req.json());
    if (id === targetClassId) return json({ error: "sameClass" }, 400);
    await db.$transaction(async (tx) => {
      // A stable lock order serializes transfers in either direction.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM classes WHERE id IN (${Prisma.join([id, targetClassId])}) ORDER BY id FOR UPDATE`);
      const classes = await tx.class.findMany({ where: { AND: [{ id: { in: [id, targetClassId] }, isActive: true }, managedClassScope(session.user)] }, select: { id: true, organizationId: true } });
      if (classes.length !== 2) throw new TransferError("forbidden", 403);
      if (classes[0].organizationId !== classes[1].organizationId) throw new TransferError("differentSchool", 409);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id IN (${Prisma.join(studentIds)}) ORDER BY id FOR UPDATE`);
      const students = await tx.user.findMany({
        where: { id: { in: studentIds }, organizationId: classes[0].organizationId, isActive: true,
          OR: [{ roles: { has: "STUDENT" } }, { roles: { isEmpty: true }, role: "STUDENT" }],
          classMemberships: { some: { classId: id } } }, select: { id: true },
      });
      if (students.length !== studentIds.length) throw new TransferError("membershipChanged", 409);
      await tx.classStudent.createMany({ data: studentIds.map((studentId) => ({ classId: targetClassId, studentId })), skipDuplicates: true });
      await tx.classStudent.deleteMany({ where: { classId: id, studentId: { in: studentIds } } });
    });
    return json({ transferred: studentIds.length });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: "invalidRequest" }, 400);
    if (error instanceof TransferError) return json({ error: error.code }, error.status);
    return json({ error: "transferFailed" }, 500);
  }
}
