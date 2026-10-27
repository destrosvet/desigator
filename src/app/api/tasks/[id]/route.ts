import { studentPublishedEvaluations } from "@/lib/result-publication";
import { rubricError, updateTaskSchema } from "@/lib/task-validation";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageTask, canViewTask } from "@/lib/authorization";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canViewTask(session.user, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canManage = await canManageTask(session.user, id);
  const isStudent = session.user.role === "STUDENT";
  const task = await db.task.findUnique({
    where: { id },
    include: {
      subject: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
      criteria: { orderBy: { order: "asc" } },
      attachments: { select: { id: true, originalName: true, mimeType: true, size: true, s3Url: true } },
      submissions: {
        where: isStudent ? { studentId: session.user.id }
          : !canManage ? { evaluations: { some: { evaluatorId: session.user.id } } } : undefined,
        include: {
          student: { select: { id: true, name: true, email: true } },
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true, s3Url: true } },
          evaluations: {
            where: isStudent ? studentPublishedEvaluations : !canManage ? { evaluatorId: session.user.id } : undefined,
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
  return NextResponse.json({ task }, { headers: { "Cache-Control": "private, no-store" } });
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
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${id} FOR UPDATE`;
      const current = await tx.task.findUnique({ where: { id }, include: { criteria: { orderBy: { order: "asc" } } } });
      if (!current) return { error: "Zadání nebylo nalezeno.", status: 404 };
      const { criteria, ...fields } = data;
      const publishing = (data.status ?? current.status) === "PUBLISHED";
      const autoCriterion = publishing && (criteria ?? current.criteria).length === 0;
      const nextCriteria = autoCriterion ? [{ name: "Celkové hodnocení", description: null, maxPoints: data.maxPoints ?? current.maxPoints }] : criteria ?? current.criteria;
      const nextMax = data.maxPoints ?? current.maxPoints;
      const changingRubric = criteria !== undefined || autoCriterion || (data.maxPoints !== undefined && data.maxPoints !== current.maxPoints);
      if (changingRubric && await tx.evaluation.count({ where: { submission: { taskId: id } } })) {
        return { error: "Kritéria a bodové maximum jsou po přiřazení hodnocení uzamčené. Použijte kopii zadání.", status: 409 };
      }
      if (criteria?.some((criterion) => criterion.id && !current.criteria.some((item) => item.id === criterion.id))) return { error: "Kritérium nepatří tomuto zadání.", status: 400 };
      const error = rubricError(nextCriteria, nextMax, publishing);
      if (error) return { error, status: 400 };
      const criteriaToSave = autoCriterion ? nextCriteria : criteria;
      if (criteriaToSave) {
        await tx.evaluationCriterion.deleteMany({ where: { taskId: id, id: { notIn: criteriaToSave.flatMap((item) => "id" in item && item.id ? [item.id] : []) } } });
        for (const [order, criterion] of criteriaToSave.entries()) {
          const criterionId = "id" in criterion ? criterion.id : undefined;
          const { id: _criterionId, ...values } = criterion as typeof criterion & { id?: string };
          if (criterionId) await tx.evaluationCriterion.update({ where: { id: criterionId }, data: { ...values, order } });
          else await tx.evaluationCriterion.create({ data: { ...values, order, taskId: id } });
        }
      }
      const task = await tx.task.update({ where: { id }, data: { ...fields, deadline: fields.deadline === undefined ? undefined : fields.deadline ? new Date(fields.deadline) : null }, include: { criteria: { orderBy: { order: "asc" } } } });
      return { task };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ task: result.task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
