import { db } from "@/lib/db";

export type AuthUser = { id: string; role: string };

export function isAdmin(user: AuthUser): boolean {
  return user.role === "ADMIN";
}

export async function canManageClass(user: AuthUser, classId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (user.role !== "TEACHER") return false;
  return Boolean(await db.class.findFirst({
    where: { id: classId, teacherId: user.id },
    select: { id: true },
  }));
}

export async function canViewSubject(user: AuthUser, subjectId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  return Boolean(await db.subject.findFirst({
    where: {
      id: subjectId,
      OR: [
        { teacherId: user.id },
        { class: { students: { some: { studentId: user.id } } } },
        { tasks: { some: { submissions: { some: { evaluations: { some: { evaluatorId: user.id } } } } } } },
      ],
    },
    select: { id: true },
  }));
}

export async function canManageSubject(user: AuthUser, subjectId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (user.role !== "TEACHER") return false;
  return Boolean(await db.subject.findFirst({
    where: { id: subjectId, teacherId: user.id, class: { teacherId: user.id } },
    select: { id: true },
  }));
}

export async function canManageTask(user: AuthUser, taskId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (user.role !== "TEACHER") return false;
  return Boolean(await db.task.findFirst({
    where: { id: taskId, creatorId: user.id, subject: { teacherId: user.id, class: { teacherId: user.id } } },
    select: { id: true },
  }));
}

export async function canReadAttachment(user: AuthUser, attachmentId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  return Boolean(await db.attachment.findFirst({
    where: {
      id: attachmentId,
      OR: [
        { task: { creatorId: user.id } },
        { task: { status: { in: ["PUBLISHED", "CLOSED"] }, subject: { class: { students: { some: { studentId: user.id } } } } } },
        { task: { submissions: { some: { evaluations: { some: { evaluatorId: user.id } } } } } },
        { submission: { studentId: user.id } },
        { submission: { task: { creatorId: user.id } } },
        { submission: { evaluations: { some: { evaluatorId: user.id } } } },
      ],
    },
    select: { id: true },
  }));
}


export async function canViewTask(user: AuthUser, taskId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  return Boolean(await db.task.findFirst({
    where: {
      id: taskId,
      OR: [
        { creatorId: user.id },
        { subject: { class: { students: { some: { studentId: user.id } } } }, status: { in: ["PUBLISHED", "CLOSED"] } },
        { submissions: { some: { evaluations: { some: { evaluatorId: user.id } } } } },
      ],
    },
    select: { id: true },
  }));
}

export async function canManageEvaluation(user: AuthUser, evaluationId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  return Boolean(await db.evaluation.findFirst({
    where: {
      id: evaluationId,
      OR: [
        { evaluatorId: user.id },
        { submission: { task: { creatorId: user.id } } },
      ],
    },
    select: { id: true },
  }));
}
