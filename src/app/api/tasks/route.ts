import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { canManageSubject } from "@/lib/authorization";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  maxPoints: z.number().min(1).default(100),
  deadline: z.string().optional(),
  subjectId: z.string(),
  criteria: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    maxPoints: z.number(),
  })).optional(),
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

    const where: any = {};
    if (status) where.status = status;

    if (session.user.role === "ADMIN") {
      // Admin vidí vše
    } else if (session.user.role === "TEACHER") {
      where.creatorId = session.user.id;
    } else if (session.user.role === "EVALUATOR") {
      where.submissions = { some: { evaluations: { some: { evaluatorId: session.user.id } } } };
    } else {
      // STUDENT – tasky z předmětů jeho tříd
      const classIds = await db.classStudent.findMany({
        where: { studentId: session.user.id },
        select: { classId: true },
      });
      const subjects = await db.subject.findMany({
        where: { classId: { in: classIds.map(c => c.classId) } },
        select: { id: true },
      });
      where.subject = { id: { in: subjects.map(s => s.id) } };
      where.status = "PUBLISHED";
    }

    if (subjectName) {
      where.subject = { ...(where.subject || {}), name: subjectName };
    }

    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sort = searchParams.get("sort");
    const order = searchParams.get("order") || "desc";

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;
    const orderBy: any = sort ? { [sort]: order } : { createdAt: "desc" };

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          creator: { select: { name: true } },
          subject: { select: { name: true, class: { select: { name: true } } } },
          _count: { select: { submissions: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json({ tasks, total, page, limit });
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


    const task = await db.task.create({
      data: {
        title,
        description,
        instructions,
        maxPoints,
        deadline: deadline ? new Date(deadline) : null,
        creatorId: session.user.id,
        subjectId,
        criteria: criteria ? { create: criteria } : undefined,
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
