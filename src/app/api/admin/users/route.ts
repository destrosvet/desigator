import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailSchema } from "@/lib/password-policy";
import { isAdmin } from "@/lib/permissions";
import { studentScope } from "@/lib/admin-records";

const creatableRole = z.enum(["STUDENT", "TEACHER", "EVALUATOR"]);
const createUserSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: emailSchema,
  role: creatableRole,
  organizationId: z.string().min(1).nullable(),
}).strict();

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = isAdmin(session.user);
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 20));
  const scope = admin
    ? {}
    : {
        OR: [
          { organizationId: session.user.organizationId || "__no_organization__" },
          { organizationId: null, roles: { has: "EVALUATOR" as const } },
          { organizationId: null, roles: { isEmpty: true }, role: "EVALUATOR" as const },
        ],
      };
  const where = {
    AND: [
      scope,
      ...(search ? [{ OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ] }] : []),
    ],
  };

  const [users, total, organizations] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, roles: true,
        organizationId: true, isActive: true, createdAt: true,
        organization: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
    db.organization.findMany({
      where: admin ? {} : { id: session.user.organizationId || "__no_organization__" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const editable = admin ? users : await db.user.findMany({ where: { AND: [{ id: { in: users.map((user) => user.id) } }, studentScope(session.user)] }, select: { id: true } });
  const editableIds = new Set(editable.map((user) => user.id));
  return NextResponse.json({ users: users.map((user) => ({ ...user, canManage: editableIds.has(user.id) })), total, page, limit, organizations }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = createUserSchema.parse(await req.json());
    const admin = isAdmin(session.user);
    if (!admin && input.role !== "EVALUATOR") {
      return NextResponse.json({ error: "Učitel může vytvářet pouze hodnotitele." }, { status: 403 });
    }
    if (!admin && (!session.user.organizationId || ![null, session.user.organizationId].includes(input.organizationId))) {
      return NextResponse.json({ error: "Hodnotitele lze přidat pouze do vlastní školy nebo jako externího." }, { status: 403 });
    }
    if (input.role !== "EVALUATOR" && !input.organizationId) {
      return NextResponse.json({ error: "Student a učitel musí mít přiřazenou organizaci." }, { status: 400 });
    }
    if (input.organizationId) {
      const organization = await db.organization.findUnique({ where: { id: input.organizationId }, select: { id: true } });
      if (!organization) return NextResponse.json({ error: "Organizace neexistuje." }, { status: 400 });
    }
    const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Účet s tímto e-mailem již existuje." }, { status: 409 });

    const tempPassword = randomBytes(18).toString("base64url");
    const roles = input.role === "TEACHER" ? ["TEACHER" as const, "EVALUATOR" as const] : [input.role];
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: await bcrypt.hash(tempPassword, 12),
        role: input.role,
        roles,
        organizationId: input.organizationId,
      },
      select: {
        id: true, name: true, email: true, role: true, roles: true,
        organizationId: true, isActive: true, createdAt: true,
        organization: { select: { name: true } },
      },
    });
    return NextResponse.json({ user, tempPassword }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Neplatné údaje." }, { status: 400 });
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "Účet s tímto e-mailem již existuje." }, { status: 409 });
    return NextResponse.json({ error: "Vytvoření uživatele selhalo." }, { status: 500 });
  }
}
