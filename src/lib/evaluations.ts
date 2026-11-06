import { managedTaskScope } from "@/lib/authorization";
import { createHash } from "node:crypto";
import { isAdmin, canEvaluate, canTeach, hasRole } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import type { AuthUser } from "@/lib/authorization";
import { anonymousAttachmentName } from "@/lib/media";
import { anonymousEvaluation } from "@/lib/permissions";

export function evaluationScope(user: AuthUser): Prisma.EvaluationWhereInput {
 if (isAdmin(user)) return {};
 const scopes: Prisma.EvaluationWhereInput[] = [{ submission: { task: managedTaskScope(user) } }];
 if (canEvaluate(user)) scopes.push({ evaluatorId: user.id });
 if (hasRole(user, "STUDENT")) scopes.push({ status: "COMPLETED", submission: {
  studentId: user.id, stage: "FINAL", OR: [{ resultsPublishedAt: { not: null } }, { task: { resultsPublishedAt: { not: null } } }],
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

export function evaluationWhere(user: AuthUser, query: z.infer<typeof evaluationQuerySchema>): Prisma.EvaluationWhereInput {
  const { search, status, taskId, subjectId, studentId, evaluatorId } = query;
  return { AND: [
    evaluationScope(user),
    ...(canEvaluate(user) || canTeach(user) ? [{ evaluatorId: user.id }] : []),
    ...(status ? [{ status }] : []),
    ...(taskId ? [{ submission: { taskId } }] : []),
    ...(subjectId ? [{ submission: { task: { subjectId } } }] : []),
    ...(studentId ? [{ submission: { studentId } }] : []),
    ...(evaluatorId ? [{ evaluatorId }] : []),
    ...(search ? [{ OR: [
      { submission: { task: { title: { contains: search, mode: "insensitive" as const } } } },
      ...(!anonymousEvaluation(user) ? [{ submission: { student: { name: { contains: search, mode: "insensitive" as const } } } }] : []),
      { feedback: { contains: search, mode: "insensitive" as const } },
    ] }] : []),
  ] };
}

export function shuffleReviewOrder<T extends { id: string }>(reviews: T[], evaluatorId: string): T[] {
  return reviews.map(review => ({
    review,
    rank: createHash("sha256").update(evaluatorId).update(":").update(review.id).digest("hex"),
  })).sort((a, b) => a.rank.localeCompare(b.rank)).map(({ review }) => review);
}

export async function listEvaluations(user: AuthUser, query: z.infer<typeof evaluationQuerySchema>) {
  const { page, limit } = query;
  const where = evaluationWhere(user, query);
  const shuffled = canEvaluate(user) || canTeach(user)
    ? shuffleReviewOrder(await db.evaluation.findMany({ where, select: { id: true } }), user.id)
    : undefined;
  const pageIds = shuffled?.slice((page - 1) * limit, page * limit).map(item => item.id);
  const [evaluations, total] = await Promise.all([
    db.evaluation.findMany({
      where: pageIds ? { AND: [where, { id: { in: pageIds } }] } : where,
      select: {
        id: true, status: true, totalPoints: true, evaluatedAt: true,
        evaluator: { select: { id: true, name: true } },
        submission: { select: {
          id: true, submittedAt: true,
          student: { select: { id: true, name: true } },
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true }, orderBy: { uploadedAt: "asc" } },
          task: { select: { id: true, title: true, maxPoints: true, subject: { select: { name: true } } } },
        } },
      },
      ...(pageIds ? {} : { orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
    }),
    shuffled?.length ?? db.evaluation.count({ where }),
  ]);
  const anonymous = anonymousEvaluation(user);
  const ordered = pageIds ? shuffleReviewOrder(evaluations, user.id) : evaluations;
  return { evaluations: ordered.map((evaluation) => anonymous ? ({ ...evaluation, submission: { ...evaluation.submission, student: undefined, attachments: evaluation.submission.attachments.map((file, index) => ({ ...file, originalName: anonymousAttachmentName(file.originalName, index) })) } }) : evaluation), total, page, limit };
}
