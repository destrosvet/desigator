CREATE TYPE "SubmissionStage" AS ENUM ('WIP', 'FINAL');
ALTER TABLE "submissions" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "stage" "SubmissionStage" NOT NULL DEFAULT 'FINAL',
  ADD COLUMN "uploadedById" TEXT,
  ADD COLUMN "changeNote" TEXT;
CREATE UNIQUE INDEX "submissions_taskId_studentId_version_key" ON "submissions"("taskId", "studentId", "version");
DROP INDEX "submissions_taskId_studentId_key";
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_version_positive" CHECK ("version" > 0);
