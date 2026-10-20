import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageTask, canViewTask } from "@/lib/authorization";
import { db } from "@/lib/db";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  maxPoints: z.number().int().positive().optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canViewTask(session.user, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isStudent = session.user.role === "STUDENT";
  const task = await db.task.findUnique({
    where: { id },
    include: {
      subject: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
      criteria: { orderBy: { order: "asc" } },
      attachments: { select: { id: true, originalName: true, mimeType: true, size: true, s3Url: true } },
      submissions: {
        where: isStudent ? { studentId: session.user.id } : undefined,
        include: {
          student: { select: { id: true, name: true, email: true } },
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true, s3Url: true } },
          evaluations: {
            include: {
              evaluator: { select: { id: true, name: true } },
              scores: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ task });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canManageTask(session.user, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = updateTaskSchema.parse(await req.json());
    const task = await db.task.update({
      where: { id },
      data: {
        ...data,
        deadline: data.deadline === undefined ? undefined : data.deadline ? new Date(data.deadline) : null,
      },
    });
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}