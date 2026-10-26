import { AdminRecordError, deleteAdminRecords } from "@/lib/admin-records";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSubject, canViewSubject, managedClassScope, visibleTaskScope } from "@/lib/authorization";
import { z } from "zod";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    if (!(await canViewSubject(session.user, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        classes: { select: { classId: true, class: { select: { id: true, name: true } } }, orderBy: { class: { name: "asc" } } },
        teacher: { select: { id: true, name: true } },
        tasks: { where: visibleTaskScope(session.user), orderBy: { createdAt: "desc" } },
      },
    });
    if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ subject });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch subject" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!(await canManageSubject(session.user, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = z.object({ name: z.string().min(1), code: z.string(), description: z.string().nullable().optional(), semester: z.enum(["FULL_YEAR", "SUMMER", "WINTER"]), year: z.coerce.number().int().min(2000).max(2100), classIds: z.array(z.string().min(1)).min(1) }).parse(await req.json());
    const classIds = [...new Set(body.classIds)];
    const classes = await db.class.findMany({ where: { id: { in: classIds }, ...managedClassScope(session.user) }, select: { id: true, organizationId: true } });
    if (classes.length !== classIds.length) return NextResponse.json({ error: "Některá vybraná skupina neexistuje nebo k ní nemáte přístup." }, { status: 403 });
    if (new Set(classes.map((item) => item.organizationId)).size !== 1) return NextResponse.json({ error: "Všechny skupiny předmětu musí patřit do stejné školy." }, { status: 400 });
    const subject = await db.subject.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
        semester: body.semester,
        year: body.year,
        classId: classIds[0],
        classes: { deleteMany: {}, create: classIds.map((classId) => ({ classId })) },
      },
      include: { classes: { select: { classId: true, class: { select: { id: true, name: true } } }, orderBy: { class: { name: "asc" } } } },
    });    return NextResponse.json({ subject });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!(await canManageSubject(session.user, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (body?.confirmed !== true) return NextResponse.json({ error: "Smazání musí být potvrzené." }, { status: 400 });
    await deleteAdminRecords(session.user, "subjects", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AdminRecordError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
