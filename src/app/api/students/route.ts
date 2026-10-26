import { randomBytes } from "crypto";
import { emailSchema, newPasswordSchema } from "@/lib/password-policy";
import { readTableSort, sortTableRows } from "@/lib/table-sorting";
import type { Prisma } from "@prisma/client";
import { studentScope } from "@/lib/admin-records";
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

    const where: any = { AND: [studentScope(session.user)] };
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

    const sorting = readTableSort(searchParams, ["name", "email", "externalId", "classes"]);
    const computedSort = sorting?.key === "classes";
    const orderBy: Prisma.UserOrderByWithRelationInput[] = [sorting && !computedSort ? { [sorting.key]: sorting.direction } : { createdAt: "desc" }, { id: "asc" }];
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
            where: session.user.role === "ADMIN" ? {} : { class: { organizationId: session.user.organizationId || "__no_organization__", ...(session.user.roles?.includes("SCHOOL_ADMIN") ? {} : { teacherId: session.user.id }) } },
            include: {
              class: { select: { name: true } },
            },
          },
        },
        orderBy,
        skip: computedSort ? undefined : skip,
        take: computedSort ? undefined : limit,
      }),
      db.user.count({ where }),
    ]);

    const ordered = computedSort ? sortTableRows(students, sorting, (row) => row.classMemberships.map((item) => item.class.name).sort((a, b) => a.localeCompare(b, "cs")).join(", ")).slice(skip, skip + limit) : students;
    return NextResponse.json({ students: ordered, total, page, limit });
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
    if (!session.user.organizationId) return NextResponse.json({ error: "Nejdříve zvolte svou školu." }, { status: 409 });
    const body = z.record(z.string(), z.unknown()).parse(await req.json());

    // Validate the complete batch before hashing or writing any account.
    if (Object.prototype.hasOwnProperty.call(body, "emails")) {
      const { emails } = z.object({ emails: z.array(emailSchema).min(1).max(200) }).strict().parse(body);
      if (new Set(emails).size !== emails.length) return NextResponse.json({ error: "Dávka obsahuje duplicitní e-mail." }, { status: 400 });
      const existing = await db.user.findMany({ where: { OR: emails.map((email) => ({ email: { equals: email, mode: "insensitive" as const } })) }, select: { email: true } });
      const occupied = new Set(existing.map((user) => user.email.toLowerCase()));
      const accounts = await Promise.all(emails.filter((email) => !occupied.has(email)).map(async (email) => {
        const tempPassword = randomBytes(18).toString("base64url");
        return { email, tempPassword, password: await bcrypt.hash(tempPassword, 12) };
      }));
      const results = await db.$transaction(async (tx) => {
        const created: Array<{ email: string; id: string; tempPassword: string }> = [];
        for (const account of accounts) {
          const user = await tx.user.create({
            data: { email: account.email, name: account.email.split("@")[0], password: account.password, role: "STUDENT", roles: ["STUDENT"], organizationId: session.user.organizationId },
            select: { id: true, email: true },
          });
          created.push({ email: user.email, id: user.id, tempPassword: account.tempPassword });
        }
        return created;
      });
      return NextResponse.json({ added: results.length, skipped: emails.length - results.length, students: results }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    // Jednotlivé přidání
    const schema = z.object({
      name: z.string().trim().min(1).max(200),
      email: emailSchema,
      password: newPasswordSchema,
    });
    const { name, email, password } = schema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email již existuje" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { name, email, password: hashed, role: "STUDENT", roles: ["STUDENT"], organizationId: session.user.organizationId },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ student: user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "E-mail již existuje. Dávka nebyla uložena; načtěte stav a zkuste znovu." }, { status: 409 });
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
