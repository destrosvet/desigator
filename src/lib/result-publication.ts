import type { Prisma } from "@prisma/client";
export const studentPublishedEvaluations: Prisma.EvaluationWhereInput = {
 status: "COMPLETED",
 submission: { stage: "FINAL", resultsPublishedAt: { not: null } },
};
export class PublishedResultsError extends Error {
 constructor() { super("Výsledky jsou zveřejněné. Před úpravou nebo přiřazením hodnotitele je učitel musí stáhnout ze zveřejnění."); }
}
export async function lockedPublicationDate(tx: Prisma.TransactionClient, submissionId: string) {
 const rows = await tx.$queryRaw<Array<{ resultsPublishedAt: Date | null }>>`SELECT "resultsPublishedAt" FROM submissions WHERE id = ${submissionId} FOR UPDATE`;
 return rows?.[0]?.resultsPublishedAt ?? null;
}
export async function requireUnpublishedResults(tx: Prisma.TransactionClient, submissionId: string) {
 if (await lockedPublicationDate(tx, submissionId)) throw new PublishedResultsError();
}
