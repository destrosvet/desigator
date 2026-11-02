import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin, primaryRole } from "@/lib/permissions";
import { OrganizationError } from "@/lib/organizations";
import { passwordRequestAllowed } from "@/lib/password-route";
const reply = (data: object, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return reply({ error: "Přihlaste se." }, 401);
  const params = new URL(req.url).searchParams;
  if (params.get("scope") === "admin") {
    if (!isAdmin(session.user)) return reply({ error: "Forbidden" }, 403);
    const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
    const limit = Math.min(100, Math.max(10, Math.floor(Number(params.get("limit")) || 20)));
    const search = (params.get("search") || "").trim().slice(0, 200);
    const where = { status: "PENDING", ...(search ? { OR: [{ user: { name: { contains: search, mode: "insensitive" as const } } }, { user: { email: { contains: search, mode: "insensitive" as const } } }] } : {}) };
    const [requests, total] = await Promise.all([
      db.accessRequest.findMany({ where, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit }), db.accessRequest.count({ where }),
    ]);
    return reply({ requests, total });
  }
  return reply({ request: await db.accessRequest.findUnique({ where: { userId: session.user.id } }) });
}
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || isAdmin(session.user)) return reply({ error: "Forbidden" }, 403);
  if (!passwordRequestAllowed(req)) return reply({ error: "Neplatný požadavek." }, 400);
  try {
    const input = z.object({ requestedRole: z.enum(["TEACHER", "SCHOOL_ADMIN"]), reason: z.string().trim().min(10).max(2000) }).strict().parse(await req.json());
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${session.user.id} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      if (!user.isActive || !user.emailVerifiedAt) throw new OrganizationError("Nejdříve ověřte svůj e-mail.", 403);
      const existing = await tx.accessRequest.findUnique({ where: { userId: user.id } });
      if (existing?.status === "PENDING") throw new OrganizationError("Vaše žádost již čeká na schválení.");
      if (existing?.updatedAt && existing.updatedAt > new Date(Date.now() - 86400000)) throw new OrganizationError("Další žádost můžete podat za 24 hodin.", 429);
      await tx.accessRequest.upsert({ where: { userId: user.id }, create: { ...input, userId: user.id }, update: { ...input, status: "PENDING", reviewedAt: null, reviewedById: null, reviewNote: null, createdAt: new Date() } });
    });
    return reply({ success: true }, 201);
  } catch (error) { return failure(error); }
}
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user)) return reply({ error: "Forbidden" }, 403);
  if (!passwordRequestAllowed(req)) return reply({ error: "Neplatný požadavek." }, 400);
  try {
    const { id, decision, reviewNote } = z.object({ id: z.string().min(1), decision: z.enum(["APPROVED", "REJECTED"]), reviewNote: z.string().trim().max(2000).default("") }).strict().parse(await req.json());
    const candidate = await db.accessRequest.findUnique({ where: { id } });
    if (!candidate) return reply({ error: "Žádost nebyla nalezena." }, 404);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(194728103)`;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${candidate.userId} FOR UPDATE`;
      const [actor, request, user] = await Promise.all([tx.user.findUnique({ where: { id: session.user.id } }), tx.accessRequest.findUnique({ where: { id } }), tx.user.findUnique({ where: { id: candidate.userId } })]);
      if (!actor?.isActive || !isAdmin(actor)) throw new OrganizationError("Oprávnění se změnila.", 403);
      if (!request || request.status !== "PENDING") throw new OrganizationError("Žádost již byla vyřízena.");
      if (decision === "APPROVED") {
        if (!user?.isActive || !user.emailVerifiedAt || isAdmin(user)) throw new OrganizationError("Tento účet nelze povýšit.");
        if (!["TEACHER", "SCHOOL_ADMIN"].includes(request.requestedRole)) throw new OrganizationError("Neplatná požadovaná role.");
        const [works, memberships] = await Promise.all([tx.submission.count({ where: { studentId: user.id } }), tx.classStudent.count({ where: { studentId: user.id } })]);
        if (works || memberships) throw new OrganizationError("Účet má studentskou historii. Pro vyučování použijte samostatný účet.");
        const roles = request.requestedRole === "SCHOOL_ADMIN" ? ["SCHOOL_ADMIN" as const, "TEACHER" as const, "EVALUATOR" as const] : ["TEACHER" as const, "EVALUATOR" as const];
        // A teacher request must not demote a previously approved school administrator.
        if (user.roles.includes("SCHOOL_ADMIN") && !roles.includes("SCHOOL_ADMIN")) roles.unshift("SCHOOL_ADMIN");
        await tx.user.update({ where: { id: user.id }, data: { roles, role: primaryRole(roles) as "TEACHER" } });
      }
      await tx.accessRequest.update({ where: { id }, data: { status: decision, reviewedAt: new Date(), reviewedById: actor.id, reviewNote: reviewNote || null } });
    });
    return reply({ success: true });
  } catch (error) { return failure(error); }
}
function failure(error: unknown) {
  if (error instanceof OrganizationError) return reply({ error: error.message }, error.status);
  if (error instanceof z.ZodError || error instanceof SyntaxError) return reply({ error: "Zkontrolujte požadovanou roli a zdůvodnění (10 až 2000 znaků)." }, 400);
  return reply({ error: "Žádost se nepodařilo uložit." }, 500);
}
