import { managedTaskScope, managedSubjectScope } from "@/lib/authorization";
import { isAdmin, isSchoolAdmin, schoolId } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthUser } from "@/lib/authorization";
import { rubricError } from "@/lib/task-validation";

export type AdminEntity = "students" | "subjects" | "tasks";
export class AdminRecordError extends Error { constructor(message: string, public status: number) { super(message); } }
export function studentScope(user: AuthUser): Prisma.UserWhereInput {
  return { role: "STUDENT", ...(isAdmin(user) ? {} : { organizationId: schoolId(user), ...(isSchoolAdmin(user) ? {} : { classMemberships: { some: { class: { teacherId: user.id, organizationId: schoolId(user) } } } }) }) };
}
export async function deleteAdminRecords(user: AuthUser, entity: AdminEntity, ids: string[]) {
  if (!["ADMIN", "TEACHER"].includes(user.role)) throw new AdminRecordError("K této operaci nemáte oprávnění.", 403);
  return db.$transaction(async (tx) => {
    const table = entity === "students" ? Prisma.sql`users` : entity === "subjects" ? Prisma.sql`subjects` : Prisma.sql`tasks`;
    await tx.$queryRaw(Prisma.sql`SELECT id FROM ${table} WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
    if (entity === "tasks") {
      const rows = await tx.task.findMany({ where: { id: { in: ids }, ...managedTaskScope(user) }, select: { id: true, _count: { select: { submissions: true, attachments: true } } } });
      if (rows.length !== ids.length) throw new AdminRecordError("Některý záznam neexistuje nebo k němu nemáte oprávnění. Nic nebylo smazáno.", 403);
      if (rows.some((row) => row._count.submissions || row._count.attachments)) throw new AdminRecordError("Zadání s odevzdáními nebo přílohami nelze smazat. Nejprve vyřešte navázané záznamy; historii prací a hodnocení zachováváme.", 409);
      return tx.task.deleteMany({ where: { id: { in: ids } } });
    }
    if (entity === "subjects") {
      const rows = await tx.subject.findMany({ where: { id: { in: ids }, ...managedSubjectScope(user) }, select: { id: true, _count: { select: { tasks: true } } } });
      if (rows.length !== ids.length) throw new AdminRecordError("Některý záznam neexistuje nebo k němu nemáte oprávnění. Nic nebylo smazáno.", 403);
      if (rows.some((row) => row._count.tasks)) throw new AdminRecordError("Předmět obsahuje zadání. Nejprve je přesuňte nebo vyřešte; nic nebylo smazáno.", 409);
      return tx.subject.deleteMany({ where: { id: { in: ids } } });
    }
    const rows = await tx.user.findMany({ where: { AND: [studentScope(user), { id: { in: ids } }] }, select: { id: true, legacyId: true, _count: { select: { submissions: true } }, classMemberships: { select: { class: { select: { teacherId: true } } } } } });
    if (rows.length !== ids.length) throw new AdminRecordError("Některý student neexistuje nebo k němu nemáte oprávnění. Nic nebylo smazáno.", 403);
    if (rows.some((row) => row.legacyId != null || row._count.submissions || (!isAdmin(user) && !isSchoolAdmin(user) && row.classMemberships.some((member) => member.class.teacherId !== user.id)))) throw new AdminRecordError("Studenta s historickými daty, odevzdanými pracemi nebo členstvím u jiného učitele nelze smazat. Nic nebylo smazáno.", 409);
    return tx.user.deleteMany({ where: { id: { in: ids }, role: "STUDENT" } });
  });
}
export async function setTaskStatuses(user: AuthUser, ids: string[], status: "DRAFT" | "PUBLISHED" | "CLOSED") {
  if (!["ADMIN", "TEACHER"].includes(user.role)) throw new AdminRecordError("Forbidden", 403);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM tasks WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
    const rows = await tx.task.findMany({ where: { id: { in: ids }, ...managedTaskScope(user) }, include: { criteria: true } });
    if (rows.length !== ids.length) throw new AdminRecordError("Některé zadání nelze upravit. Nic nebylo změněno.", 403);
    if (status === "PUBLISHED") for (const row of rows) { const error = rubricError(row.criteria, row.maxPoints, true); if (error) throw new AdminRecordError(error + " Nic nebylo změněno.", 409); }
    return tx.task.updateMany({ where: { id: { in: ids } }, data: { status } });
  });
}
