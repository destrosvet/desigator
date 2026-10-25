import type { Prisma, SubmissionStage } from "@prisma/client";

// Each new upload is immutable and evaluations stay attached to its submission ID.
// The unique index rejects concurrent attempts to create the same next version.
export async function createSubmissionVersion(tx: Prisma.TransactionClient, data: { taskId: string; studentId: string; uploadedById: string; stage: SubmissionStage; content?: string | null; changeNote?: string | null }) {
  const latest = await tx.submission.findFirst({ where: { taskId: data.taskId, studentId: data.studentId }, orderBy: { version: "desc" }, select: { version: true } });
  return tx.submission.create({ data: { ...data, version: (latest?.version ?? 0) + 1, status: "SUBMITTED" } });
}
