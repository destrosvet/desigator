import { managedTaskScope } from "@/lib/authorization";
import { isAdmin, canEvaluate, hasRole } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import type { AuthUser } from "@/lib/authorization";
import { anonymousAttachmentName } from "@/lib/media";

export function evaluationScope(user: AuthUser): Prisma.EvaluationWhereInput {
 if (isAdmin(user)) return {};
 const scopes: Prisma.EvaluationWhereInput[] = [{ submission: { task: managedTaskScope(user) } }];
 if (canEvaluate(user)) scopes.push({ evaluatorId: user.id });
 if (hasRole(user, "STUDENT")) scopes.push({ status: "COMPLETED", submission: {
  studentId: user.id, stage: "FINAL", resultsPublishedAt: { not: null },
  task: { status: { in: ["PUBLISHED", "CLOSED"] }, subject: { classes: { some: { class: { organizationId: user.organizationId || "__no_organization__", students: { some: { studentId: user.id } } } } } } },
 } });
 return { OR: scopes };
}

export const evaluationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(60),
  search: z.string().max(200).default(""),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  taskId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  evaluatorId: z.string().min(1).optional(),
});

export async function listEvaluations(user: AuthUser, query: z.infer<typeof evaluationQuerySchema>) {
  const { page, limit, search, status, taskId, subjectId, studentId, evaluatorId } = query;
  const where: Prisma.EvaluationWhereInput = { AND: [
    evaluationScope(user),
    ...(status ? [{ status }] : []),
    ...(taskId ? [{ submission: { taskId } }] : []),
    ...(subjectId ? [{ submission: { task: { subjectId } } }] : []),
    ...(studentId ? [{ submission: { studentId } }] : []),
    ...(evaluatorId ? [{ evaluatorId }] : []),
    ...(search ? [{ OR: [
      { submission: { task: { title: { contains: search, mode: "insensitive" as const } } } },
      { feedback: { contains: search, mode: "insensitive" as const } },
    ] }] : []),
  ] };
  const [evaluations, total] = await Promise.all([
    db.evaluation.findMany({
      where,
      select: {
        id: true, status: true, totalPoints: true, evaluatedAt: true,
        evaluator: { select: { id: true, name: true } },
        submission: { select: {
          id: true, submittedAt: true,
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true }, orderBy: { uploadedAt: "asc" } },
          task: { select: { id: true, title: true, maxPoints: true, subject: { select: { name: true } } } },
        } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit,
    }),
    db.evaluation.count({ where }),
  ]);
  return { evaluations: evaluations.map((evaluation) => ({ ...evaluation, submission: { ...evaluation.submission, attachments: evaluation.submission.attachments.map((file, index) => ({ ...file, originalName: anonymousAttachmentName(file.originalName, index) })) } })), total, page, limit };
}
