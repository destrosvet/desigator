import { visibleSubjectScope, visibleTaskScope } from "@/lib/authorization";
import { readTableSort } from "@/lib/table-sorting";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { canManageClass } from "@/lib/authorization";

const subjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  semester: z.enum(["FULL_YEAR", "SUMMER", "WINTER"]).default("FULL_YEAR"),
  year: z.number().min(2000).max(2100).default(new Date().getFullYear()),
  classId: z.string(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const year = searchParams.get("year");
    const semester = searchParams.get("semester");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sorting = readTableSort(searchParams, ["code", "name", "class", "semester", "year", "teacher", "tasks"]);
    const order = sorting?.direction ?? "desc";

    const where: any = { AND: [visibleSubjectScope(session.user)] };
    if (classId) where.classId = classId;
    if (year) where.year = parseInt(year);
    if (semester) where.semester = semester;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions: Record<string, Prisma.SubjectOrderByWithRelationInput> = { code: { code: order }, name: { name: order }, class: { class: { name: order } }, semester: { semester: order }, year: { year: order }, teacher: { teacher: { name: order } }, tasks: { tasks: { _count: order } } };
    const orderBy: Prisma.SubjectOrderByWithRelationInput[] = [sorting ? sortOptions[sorting.key] : { year: "desc" }, { id: "asc" }];

    const [subjects, total] = await Promise.all([
      db.subject.findMany({
        where,
        include: {
          class: { select: { name: true } },
          teacher: { select: { name: true } },
          _count: { select: { tasks: { where: visibleTaskScope(session.user) } } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.subject.count({ where }),
    ]);

    return NextResponse.json({ subjects, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, semester, year, classId } = subjectSchema.parse(body);

    if (!(await canManageClass(session.user, classId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subject = await db.subject.create({
      data: {
        name,
        description,
        semester,
        year,
        classId,
        teacherId: session.user.id,
      },
      include: {
        class: { select: { name: true } },
        teacher: { select: { name: true } },
      },
    });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
