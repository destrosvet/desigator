import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canTeach, canEvaluate, hasRole, isAdmin, isSchoolAdmin, schoolId, type PermissionUser } from "@/lib/permissions";
export { isAdmin } from "@/lib/permissions";
export type AuthUser = PermissionUser;

export function managedClassScope(user: AuthUser): Prisma.ClassWhereInput {
  if (isAdmin(user)) return {};
  if (!canTeach(user)) return { id: { in: [] } };
  return { organizationId: schoolId(user), ...(isSchoolAdmin(user) ? {} : { teacherId: user.id }) };
}
export function managedSubjectScope(user: AuthUser): Prisma.SubjectWhereInput {
  if (isAdmin(user)) return {};
  if (!canTeach(user)) return { id: { in: [] } };
  return { class: { organizationId: schoolId(user) }, ...(isSchoolAdmin(user) ? {} : { teacherId: user.id }) };
}
export function managedTaskScope(user: AuthUser): Prisma.TaskWhereInput {
  if (isAdmin(user)) return {};
  if (!canTeach(user)) return { id: { in: [] } };
  return { subject: { class: { organizationId: schoolId(user) } }, ...(isSchoolAdmin(user) ? {} : { creatorId: user.id }) };
}
export function visibleClassScope(user: AuthUser): Prisma.ClassWhereInput {
  if (isAdmin(user)) return {};
  return { OR: [managedClassScope(user), ...(hasRole(user, "STUDENT") ? [{ organizationId: schoolId(user), students: { some: { studentId: user.id } } }] : [])] };
}
export function visibleSubjectScope(user: AuthUser): Prisma.SubjectWhereInput {
  if (isAdmin(user)) return {};
  return { OR: [managedSubjectScope(user), ...(hasRole(user, "STUDENT") ? [{ class: { organizationId: schoolId(user), students: { some: { studentId: user.id } } } }] : []),
    ...(canEvaluate(user) ? [{ tasks: { some: { submissions: { some: { evaluations: { some: { evaluatorId: user.id } } } } } } }] : [])] };
}
export function visibleTaskScope(user: AuthUser): Prisma.TaskWhereInput {
  if (isAdmin(user)) return {};
  return { OR: [managedTaskScope(user), ...(hasRole(user, "STUDENT") ? [{ status: { in: ["PUBLISHED", "CLOSED"] as ("PUBLISHED" | "CLOSED")[] }, subject: { class: { organizationId: schoolId(user), students: { some: { studentId: user.id } } } } }] : []),
    ...(canEvaluate(user) ? [{ submissions: { some: { evaluations: { some: { evaluatorId: user.id } } } } }] : [])] };
}
export async function canManageClass(user: AuthUser, id: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (!canTeach(user)) return false;
  return Boolean(await db.class.findFirst({ where: { id, ...managedClassScope(user) }, select: { id: true } }));
}
export async function canViewSubject(user: AuthUser, id: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  return Boolean(await db.subject.findFirst({ where: { id, ...visibleSubjectScope(user) }, select: { id: true } }));
}
export async function canManageSubject(user: AuthUser, id: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (!canTeach(user)) return false;
  return Boolean(await db.subject.findFirst({ where: { id, ...managedSubjectScope(user) }, select: { id: true } }));
}
export async function canManageTask(user: AuthUser, id: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (!canTeach(user)) return false;
  return Boolean(await db.task.findFirst({ where: { id, ...managedTaskScope(user) }, select: { id: true } }));
}
export async function canReadAttachment(user: AuthUser, id: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  return Boolean(await db.attachment.findFirst({ where: { id, OR: [
    { task: visibleTaskScope(user) },
    { submission: { task: managedTaskScope(user) } },
    { submission: { studentId: user.id, task: { subject: { class: { organizationId: schoolId(user) } } } } },
    ...(canEvaluate(user) ? [{ submission: { evaluations: { some: { evaluatorId: user.id } } } }] : []),
  ] }, select: { id: true } }));
}
export async function canViewTask(user: AuthUser, id: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  return Boolean(await db.task.findFirst({ where: { id, ...visibleTaskScope(user) }, select: { id: true } }));
}
export async function canManageEvaluation(user: AuthUser, id: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (!canEvaluate(user)) return false;
  return Boolean(await db.evaluation.findFirst({ where: { id, evaluatorId: user.id }, select: { id: true } }));
}
