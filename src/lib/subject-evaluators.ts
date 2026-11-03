import { db } from "@/lib/db";
import { canEvaluate, type PermissionUser } from "@/lib/permissions";
import { rubricError } from "@/lib/task-validation";
import { lockedPublicationDate } from "@/lib/result-publication";

// Refresh on entry to the review workspace so future tasks and submissions are
// included too. Existing scores and completed reviews are never overwritten.
export async function syncSubjectEvaluations(user: PermissionUser) {
  if (!canEvaluate(user)) return;
  const assignments = await db.subjectEvaluator.findMany({ where: { evaluatorId: user.id, subject: { isActive: true }, evaluator: { isActive: true } }, select: { subjectId: true } });
  if (!assignments.length) return;
  await db.$transaction(async (tx) => {
    // Serialize with rubric edits and publication, in a stable task order.
    const tasks = await tx.task.findMany({ where: { subjectId: { in: assignments.map(a => a.subjectId) }, status: { in: ["PUBLISHED", "CLOSED"] } }, select: { id: true }, orderBy: { id: "asc" } });
    for (const { id } of tasks) {
      await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${id} FOR UPDATE`;
      const task = await tx.task.findFirst({ where: { id, status: { in: ["PUBLISHED", "CLOSED"] }, subject: { isActive: true, evaluators: { some: { evaluatorId: user.id } } } }, include: { criteria: true } });
      if (!task || rubricError(task.criteria, task.maxPoints, true)) continue;
      const versions = await tx.submission.findMany({ where: { taskId: id }, orderBy: [{ studentId: "asc" }, { version: "desc" }], select: { id: true, studentId: true, stage: true, resultsPublishedAt: true } });
      const seen = new Set<string>();
      const latest = versions.filter(work => { if (seen.has(work.studentId)) return false; seen.add(work.studentId); return work.stage === "FINAL" && (!work.resultsPublishedAt || !!task.resultsPublishedAt); });
      const unlocked: typeof latest = [];
      for (const work of latest) if (!(await lockedPublicationDate(tx, work.id))) unlocked.push(work);
      if (unlocked.length) await tx.evaluation.createMany({ data: unlocked.map(work => ({ submissionId: work.id, evaluatorId: user.id })), skipDuplicates: true });
    }
  }, { timeout: 20000 });
}
