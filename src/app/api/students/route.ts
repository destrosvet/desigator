import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = { role: "STUDENT" };
    if (classId) {
      where.classMemberships = { some: { classId } };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { externalId: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          externalId: true,
          createdAt: true,
          classMemberships: {
            include: {
              class: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({ students, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Hromadné přidání – pole emailů
    if (body.emails && Array.isArray(body.emails)) {
      const results: Array<{ email: string; id: string; tempPassword: string }> = [];
      for (const email of body.emails) {
        const existing = await db.user.findUnique({ where: { email } });
        if (!existing) {
          const tempPassword = Math.random().toString(36).substring(2, 10);
          const hashed = await bcrypt.hash(tempPassword, 12);
          const user = await db.user.create({
            data: {
              email,
              name: email.split("@")[0],
              password: hashed,
              role: "STUDENT",
            },
          });
          results.push({ email, id: user.id, tempPassword });
        }
      }
      return NextResponse.json({ added: results.length, students: results }, { status: 201 });
    }

    // Jednotlivé přidání
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
    });
    const { name, email, password } = schema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email již existuje" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { name, email, password: hashed, role: "STUDENT" },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ student: user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
