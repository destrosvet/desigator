import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canTeach, isAdmin, rolesOf, schoolId, isSchoolAdmin, primaryRole } from "@/lib/permissions";
import { managedClassScope, managedSubjectScope, managedTaskScope, type AuthUser } from "@/lib/authorization";
import { AdminRecordError, deleteAdminRecords, studentScope } from "@/lib/admin-records";
import { schoolRolesSchema } from "@/lib/organizations";
import { rubricError } from "@/lib/task-validation";
import { resultPublicationBlock } from "@/lib/result-publication-policy";

const envelope = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100).refine((ids) => new Set(ids).size === ids.length),
  confirmed: z.literal(true), data: z.record(z.string(), z.unknown()).optional(), contextId: z.string().min(1).optional(),
}).strict();
const text = z.string().trim().min(2).max(200);
const description = z.string().max(20000);
const commonUser = z.object({ name: text.optional(), institution: z.string().trim().max(200).optional(), isActive: z.boolean().optional() }).strict();
const edits = {
  users: commonUser, students: commonUser,
  organizations: z.object({ name: text.optional() }).strict(),
  classes: z.object({ name: text.optional(), description: description.optional(), academicYear: z.number().int().min(1900).max(2200).optional(), isActive: z.boolean().optional() }).strict(),
  subjects: z.object({ name: text.optional(), description: description.optional(), semester: z.enum(["FULL_YEAR", "SUMMER", "WINTER"]).optional(), year: z.number().int().min(1900).max(2200).optional(), isActive: z.boolean().optional() }).strict(),
  tasks: z.object({ title: z.string().trim().min(1).max(300).optional(), description: description.optional(), instructions: description.optional(), status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional() }).strict(),
  templates: z.object({ title: z.string().trim().min(1).max(300).optional(), description: description.optional(), instructions: description.optional() }).strict(),
  attachments: z.object({ originalName: z.string().trim().min(1).max(250).refine((name) => !/[\r\n/\\]/.test(name)).optional() }).strict(),
  members: z.object({ roles: schoolRolesSchema }).strict(),
  "work-students": z.object({ published: z.boolean() }).strict(),
};
const entitySchema = z.enum(["users", "organizations", "classes", "students", "subjects", "tasks", "templates", "attachments", "members", "work-students"]);
const denied = () => new AdminRecordError("Některý záznam neexistuje nebo k němu nemáte oprávnění. Celý výběr zůstal beze změny.", 403);
function requireAll(rows: { id: string }[], ids: string[]) { if (rows.length !== ids.length) throw denied(); }

export function managedUserScope(actor: AuthUser): Prisma.UserWhereInput {
  return isAdmin(actor) ? {} : studentScope(actor);
}

async function mutate(req: Request, params: Promise<{ entity: string }>, remove: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !canTeach(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const entityResult = entitySchema.safeParse((await params).entity);
  if (!entityResult.success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const entity = entityResult.data;
  try {
    const body = envelope.parse(await req.json());
    const { ids, contextId } = body;
    const data = remove ? undefined : edits[entity].parse(body.data);
    if (data && !Object.keys(data).length) throw new AdminRecordError("Vyberte alespoň jednu vlastnost k úpravě.", 400);
    if (ids.length > 1 && data && ("name" in data || "title" in data || "originalName" in data)) throw new AdminRecordError("Název nebo jméno upravujte jednotlivě.", 400);
    if (remove && ["tasks", "subjects", "students"].includes(entity)) {
      const result = await deleteAdminRecords(session.user, entity as "tasks" | "subjects" | "students", ids);
      return NextResponse.json(result);
    }
    const result = await db.$transaction(async (tx) => {
      // One order for batch operations; child foreign keys and row locks also protect deletion.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(194728103)`;
      const actor = await tx.user.findUnique({ where: { id: session.user.id } });
      if (!actor?.isActive || !canTeach(actor)) throw denied();
      if (entity === "organizations") {
        if (!isAdmin(actor)) throw denied();
        await tx.$queryRaw(Prisma.sql`SELECT id FROM organizations WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
        const rows = await tx.organization.findMany({ where: { id: { in: ids } }, include: { _count: { select: { users: true, classes: true, invitations: true, historicalImports: true } } } });
        requireAll(rows, ids);
        if (remove) {
          if (rows.some((row) => Object.values(row._count).some(Boolean))) throw new AdminRecordError("Organizaci s členy, třídami, pozvánkami nebo historickými daty nelze smazat.", 409);
          return tx.organization.deleteMany({ where: { id: { in: ids } } });
        }
        return tx.organization.updateMany({ where: { id: { in: ids } }, data: edits.organizations.parse(data) });
      }
      if (entity === "users" || entity === "students") {
        const input = remove ? {} : commonUser.parse(data);
        await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
        const rows = await tx.user.findMany({ where: { AND: [{ id: { in: ids } }, entity === "students" ? studentScope(actor) : managedUserScope(actor)] }, include: { _count: { select: { submissions: true, evaluations: true, createdTasks: true, createdSubjects: true, taughtClasses: true, classMemberships: true, historicalCourses: true, issuedInvitations: true, assignmentTemplates: true, consultationComments: true, resultAdjustments: true, issuedAdjustments: true, revokedAdjustments: true, publishedResults: true } } } });
        requireAll(rows, ids);
        if (ids.includes(actor.id) && (remove || input.isActive === false)) throw new AdminRecordError("Vlastní účet nelze smazat ani deaktivovat.", 409);
        // School role routes lock the same organization rows.
        const organizations = [...new Set(rows.map((row) => row.organizationId).filter((id): id is string => !!id))].sort();
        for (const id of organizations) await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${id} FOR UPDATE`;
        if (remove || input.isActive === false) {
          if (rows.some((row) => row.isActive && isAdmin(row)) && !await tx.user.count({ where: { id: { notIn: ids }, isActive: true, OR: [{ roles: { has: "ADMIN" } }, { roles: { isEmpty: true }, role: "ADMIN" }] } })) throw new AdminRecordError("Platforma musí mít aktivního administrátora.", 409);
          for (const organizationId of organizations) {
            if (rows.some((row) => row.organizationId === organizationId && row.isActive && rolesOf(row).includes("SCHOOL_ADMIN")) && !await tx.user.count({ where: { id: { notIn: ids }, organizationId, isActive: true, roles: { has: "SCHOOL_ADMIN" } } })) throw new AdminRecordError("Škola musí mít alespoň jednoho aktivního správce.", 409);
          }
        }
        if (remove) {
          if (!isAdmin(actor)) throw denied();
          if (rows.some((row) => row.legacyId != null || Object.values(row._count).some(Boolean))) throw new AdminRecordError("Účet má navázané záznamy. Místo smazání jej deaktivujte.", 409);
          return tx.user.deleteMany({ where: { id: { in: ids } } });
        }
        if (!isAdmin(actor) && input.isActive !== undefined) throw denied();
        return tx.user.updateMany({ where: { id: { in: ids } }, data: { ...input, ...(input.isActive === false ? { sessionVersion: { increment: 1 } } : {}) } });
      }
      if (entity === "classes") {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM classes WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
        const rows = await tx.class.findMany({ where: { id: { in: ids }, ...managedClassScope(actor) }, include: { _count: { select: { students: true, subjects: true, subjectLinks: true } } } }); requireAll(rows, ids);
        if (remove) {
          if (rows.some((row) => Object.values(row._count).some(Boolean))) throw new AdminRecordError("Třídu se studenty nebo předměty nelze smazat. Můžete ji archivovat.", 409);
          return tx.class.deleteMany({ where: { id: { in: ids } } });
        }
        return tx.class.updateMany({ where: { id: { in: ids } }, data: edits.classes.parse(data) });
      }
      if (entity === "subjects") {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM subjects WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
        const rows = await tx.subject.findMany({ where: { id: { in: ids }, ...managedSubjectScope(actor) }, select: { id: true } }); requireAll(rows, ids);
        return tx.subject.updateMany({ where: { id: { in: ids } }, data: edits.subjects.parse(data) });
      }
      if (entity === "tasks") {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM tasks WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
        const rows = await tx.task.findMany({ where: { id: { in: ids }, ...managedTaskScope(actor) }, include: { criteria: true } }); requireAll(rows, ids);
        const input = edits.tasks.parse(data);
        if (input.status === "PUBLISHED") for (const row of rows) { const error = rubricError(row.criteria, row.maxPoints, true); if (error) throw new AdminRecordError(error, 409); }
        return tx.task.updateMany({ where: { id: { in: ids } }, data: input });
      }
      if (entity === "templates") {
        const where = { id: { in: ids }, ...(isAdmin(actor) ? {} : { creatorId: actor.id }) };
        const rows = await tx.assignmentTemplate.findMany({ where, select: { id: true } }); requireAll(rows, ids);
        return remove ? tx.assignmentTemplate.deleteMany({ where }) : tx.assignmentTemplate.updateMany({ where, data: edits.templates.parse(data) });
      }
      if (entity === "attachments") {
        if (remove) throw new AdminRecordError("Přílohy mažte pomocí akce zadání.", 400);
        const where = { id: { in: ids }, submissionId: null, task: managedTaskScope(actor), ...(contextId ? { taskId: contextId } : {}) };
        const rows = await tx.attachment.findMany({ where, select: { id: true } }); requireAll(rows, ids);
        return tx.attachment.updateMany({ where, data: edits.attachments.parse(data) });
      }
      if (entity === "work-students") {
        if (!contextId) throw denied();
        await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${contextId} FOR UPDATE`;
        const task = await tx.task.findFirst({ where: { id: contextId, ...managedTaskScope(actor) }, select: { id: true, status: true, maxPoints: true, resultsPublishedAt: true } });
        if (!task) throw denied();
        await tx.$queryRaw(Prisma.sql`SELECT id FROM submissions WHERE "taskId" = ${contextId} AND "studentId" IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
        const works = await tx.submission.findMany({ where: { taskId: contextId, studentId: { in: ids } }, orderBy: { version: "desc" }, include: { evaluations: { select: { status: true, totalPoints: true } }, _count: { select: { attachments: true, consultationComments: true } } } });
        if (new Set(works.map((work) => work.studentId)).size !== ids.length) throw new AdminRecordError("Některý vybraný student nemá odevzdání. Nic nebylo změněno.", 409);
        if (remove) {
          if (works.some((work) => work.evaluations.length || work._count.attachments || work._count.consultationComments || work.resultsPublishedAt)) throw new AdminRecordError("Práci s přílohami, hodnocením, konzultacemi nebo zveřejněnými výsledky nelze smazat.", 409);
          return tx.submission.deleteMany({ where: { id: { in: works.map((work) => work.id) } } });
        }
        const { published } = edits["work-students"].parse(data);
        if (!published && task.resultsPublishedAt) throw new AdminRecordError("Nejdříve vypněte zveřejnění výsledků celého zadání.", 409);
        const latest = ids.map((id) => works.find((work) => work.studentId === id && work.stage === "FINAL"));
        if (latest.some((work) => !work)) throw new AdminRecordError("Každý vybraný student musí mít finální odevzdání.", 409);
        if (published) for (const work of latest) {
          if (task.status === "DRAFT") throw new AdminRecordError("Výsledky konceptu nelze zveřejnit.", 409);
          const error = resultPublicationBlock(work!.stage, work!.evaluations, task.maxPoints);
          if (error) throw new AdminRecordError("Některá práce nemá dokončené platné hodnocení. Nic nebylo zveřejněno.", 409);
        }
        return tx.submission.updateMany({ where: { id: { in: latest.map((work) => work!.id) } }, data: { resultsPublishedAt: published ? new Date() : null, resultsPublishedById: published ? actor.id : null } });
      }
      if (!contextId || (!isAdmin(actor) && (!isSchoolAdmin(actor) || schoolId(actor) !== contextId))) throw denied();
      await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${contextId} FOR UPDATE`;
      const rows = await tx.user.findMany({ where: { id: { in: ids }, organizationId: contextId }, include: { _count: { select: { taughtClasses: true, classMemberships: true, createdSubjects: true, createdTasks: true, submissions: true, historicalCourses: true, evaluations: true } } } }); requireAll(rows, ids);
      if (rows.some((row) => isAdmin(row) && !isAdmin(actor))) throw denied();
      const input = remove ? { roles: [] } : edits.members.parse(data);
      if (remove && rows.some((row) => Object.values(row._count).some(Boolean))) throw new AdminRecordError("Člena s výukou, členstvím ve třídě nebo historií prací nelze z organizace odebrat.", 409);
      if (!remove && rows.some((row) => rolesOf(row).includes("STUDENT") !== input.roles.includes("STUDENT"))) throw new AdminRecordError("Změna mezi studentem a pracovníkem školy není podporována.", 409);
      if (!input.roles.includes("SCHOOL_ADMIN") && rows.some((row) => row.isActive && rolesOf(row).includes("SCHOOL_ADMIN")) && !await tx.user.count({ where: { organizationId: contextId, id: { notIn: ids }, isActive: true, roles: { has: "SCHOOL_ADMIN" } } })) throw new AdminRecordError("Škola musí mít alespoň jednoho aktivního správce.", 409);
      for (const row of rows) { const roles = [...(isAdmin(row) ? ["ADMIN" as const] : []), ...(remove ? [rolesOf(row).includes("STUDENT") ? "STUDENT" as const : "EVALUATOR" as const] : input.roles)]; await tx.user.update({ where: { id: row.id }, data: { roles, role: primaryRole(roles) as "ADMIN" | "TEACHER" | "EVALUATOR" | "STUDENT", ...(remove ? { organizationId: null } : {}) } }); }
      return { count: ids.length };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminRecordError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "Neplatná nebo nepotvrzená úprava. Nic nebylo změněno." }, { status: 400 });
    return NextResponse.json({ error: "Operace selhala kvůli navázaným záznamům nebo souběžné změně. Celý výběr zůstal beze změny." }, { status: 409 });
  }
}
export async function PATCH(req: Request, { params }: { params: Promise<{ entity: string }> }) { return mutate(req, params, false); }
export async function DELETE(req: Request, { params }: { params: Promise<{ entity: string }> }) { return mutate(req, params, true); }
