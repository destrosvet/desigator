import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageTask } from "@/lib/authorization";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!(await canManageTask(session.user, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const originalTask = await db.task.findUnique({
      where: { id },
      include: { criteria: true },
    });

    if (!originalTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { title, description, instructions, maxPoints, subjectId, criteria } = originalTask;

    const newTask = await db.task.create({
      data: {
        title: `${title} (kopie)`,
        description,
        instructions,
        maxPoints,
        creatorId: session.user.id,
        templateId: originalTask.id,
        subjectId,
        status: "DRAFT",
        criteria: criteria.length > 0
          ? { create: criteria.map(c => ({
              name: c.name,
              description: c.description,
              maxPoints: c.maxPoints,
              order: c.order,
            })) }
          : undefined,
      },
      include: { criteria: true },
    });

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error) {
    console.error("Duplicate error:", error);
    return NextResponse.json({ error: "Failed to duplicate task" }, { status: 500 });
  }
}
