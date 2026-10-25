import { isAdmin, isSchoolAdmin } from "@/lib/permissions";
import { visibleTaskScope, managedTaskScope } from "@/lib/authorization";
import { readTableSort, sortTableRows } from "@/lib/table-sorting";
import type { Prisma } from "@prisma/client";
import { criteriaInputSchema, rubricError } from "@/lib/task-validation";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { canManageSubject } from "@/lib/authorization";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(20000).optional(),
  instructions: z.string().max(20000).optional(),
  maxPoints: z.number().int().min(1).max(10000).default(100),
  deadline: z.string().datetime().nullable().optional(),
  subjectId: z.string().min(1),
  criteria: criteriaInputSchema.optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const subjectName = searchParams.get("subjectName");
    const status = searchParams.get("status");

    const where: any = { AND: [visibleTaskScope(session.user)] };
    if (status) where.status = status;
    const classId = searchParams.get("classId");
    if (classId) where.subject = { ...(where.subject || {}), classId };
    if (subjectName) {
      where.subject = { ...(where.subject || {}), name: subjectName };
    }

    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sorting = readTableSort(searchParams, ["title", "subject", "class", "deadline", "status", "submissions"]);
    const computedSort = sorting?.key === "submissions";
    const order = sorting?.direction ?? "desc";

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions: Record<string, Prisma.TaskOrderByWithRelationInput> = { title: { title: order }, subject: { subject: { name: order } }, class: { subject: { class: { name: order } } }, deadline: { deadline: { sort: order, nulls: "last" } }, status: { status: order } };
    const orderBy: Prisma.TaskOrderByWithRelationInput[] = [sorting && !computedSort ? sortOptions[sorting.key] : { createdAt: "desc" }, { id: "asc" }];

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          creator: { select: { name: true } },
          subject: { select: { name: true, class: { select: { name: true, organizationId: true, _count: { select: { students: true } } } } } },
          submissions: { where: session.user.role === "STUDENT" ? { studentId: session.user.id } : { OR: [{ task: managedTaskScope(session.user) }, { evaluations: { some: { evaluatorId: session.user.id } } }] }, select: { studentId: true }, distinct: ["studentId"] },
          _count: { select: { submissions: { where: session.user.role === "STUDENT" ? { studentId: session.user.id } : { OR: [{ task: managedTaskScope(session.user) }, { evaluations: { some: { evaluatorId: session.user.id } } }] } } } },
        },
        orderBy,
        skip: computedSort ? undefined : skip,
        take: computedSort ? undefined : limit,
      }),
      db.task.count({ where }),
    ]);

    const summaries = tasks.map(({ submissions, ...task }) => ({ ...task, submissionCount: submissions.length, studentCount: isAdmin(session.user) || (task.subject.class.organizationId === session.user.organizationId && (isSchoolAdmin(session.user) || task.creatorId === session.user.id)) ? task.subject.class._count.students : submissions.length }));
    const ordered = computedSort ? sortTableRows(summaries, sorting, (row) => row.submissionCount).slice(skip, skip + limit) : summaries;
    return NextResponse.json({ tasks: ordered, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, instructions, maxPoints, deadline, subjectId, criteria } = taskSchema.parse(body);
    if (!(await canManageSubject(session.user, subjectId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    const error = rubricError(criteria || [], maxPoints);
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (criteria?.some((criterion) => criterion.id)) return NextResponse.json({ error: "Nová kritéria nesmí přebírat cizí ID." }, { status: 400 });
    const task = await db.task.create({
      data: {
        title,
        description,
        instructions,
        maxPoints,
        deadline: deadline ? new Date(deadline) : null,
        creatorId: session.user.id,
        subjectId,
        criteria: criteria ? { create: criteria.map(({ id: _id, ...criterion }, order) => ({ ...criterion, order })) } : undefined,
      },
      include: { criteria: true },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
