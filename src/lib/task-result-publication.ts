import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { TaskPublicationSummary } from "@/lib/task-publication-policy";
export async function readTaskPublication(taskId: string, database: Pick<Prisma.TransactionClient, "task" | "submission"> = db): Promise<TaskPublicationSummary | null> {
 const task = await database.task.findUnique({ where: { id: taskId }, select: { status: true, resultsPublishedAt: true } });
 if (!task) return null;
 const works = await database.submission.findMany({
  where: { taskId, stage: "FINAL" }, orderBy: [{ version: "desc" }, { id: "asc" }], distinct: ["studentId"],
  select: { evaluations: { select: { status: true } } },
 });
 const completed = works.filter(work => work.evaluations.some(review => review.status === "COMPLETED")).length;
 return { enabled: Boolean(task.resultsPublishedAt), publishedAt: task.resultsPublishedAt?.toISOString() ?? null, total: works.length, completed, pending: works.length - completed, draft: task.status === "DRAFT" };
}
