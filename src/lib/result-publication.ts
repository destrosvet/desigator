import type { Prisma } from "@prisma/client";
export const studentPublishedEvaluations: Prisma.EvaluationWhereInput = {
 status: "COMPLETED",
 submission: { stage: "FINAL", OR: [{ resultsPublishedAt: { not: null } }, { task: { resultsPublishedAt: { not: null } } }] },
};
export class PublishedResultsError extends Error {
 constructor() { super("Výsledky jsou zveřejněné. Před úpravou nebo přiřazením hodnotitele je učitel musí stáhnout ze zveřejnění."); }
}
export async function lockedPublicationDate(tx: Prisma.TransactionClient, submissionId: string) {
 const rows = await tx.$queryRaw<Array<{ resultsPublishedAt: Date | null }>>`SELECT CASE WHEN t."resultsPublishedAt" IS NOT NULL THEN NULL ELSE s."resultsPublishedAt" END AS "resultsPublishedAt" FROM submissions s JOIN tasks t ON t.id = s."taskId" WHERE s.id = ${submissionId} FOR UPDATE OF s`;
 return rows?.[0]?.resultsPublishedAt ?? null;
}
export async function requireUnpublishedResults(tx: Prisma.TransactionClient, submissionId: string) {
 if (await lockedPublicationDate(tx, submissionId)) throw new PublishedResultsError();
}
