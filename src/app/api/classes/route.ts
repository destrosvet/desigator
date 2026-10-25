import { visibleClassScope } from "@/lib/authorization";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const classSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER", "STUDENT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = { AND: [visibleClassScope(session.user)] };
    if (teacherId && session.user.role === "ADMIN") {
      where.teacherId = teacherId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [classes, total] = await Promise.all([
      db.class.findMany({
        where,
        include: {
          teacher: { select: { name: true, email: true } },
          _count: { select: { students: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.class.count({ where }),
    ]);

    return NextResponse.json({ classes, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description } = classSchema.parse(body);

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    if (!session.user.organizationId) return NextResponse.json({ error: "Nejdříve založte školu v Nastavení nebo přijměte pozvánku." }, { status: 409 });
    const cls = await db.class.create({
      data: {
        name,
        description,
        code,
        teacherId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json({ class: cls }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
