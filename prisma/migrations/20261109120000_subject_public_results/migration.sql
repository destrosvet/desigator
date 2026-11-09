ALTER TABLE "subjects" ADD COLUMN "publicResultsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "subject_results_shares" ("subjectId" TEXT NOT NULL, "token" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "subject_results_shares_pkey" PRIMARY KEY ("subjectId"));
CREATE UNIQUE INDEX "subject_results_shares_token_key" ON "subject_results_shares"("token");
ALTER TABLE "subject_results_shares" ADD CONSTRAINT "subject_results_shares_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
