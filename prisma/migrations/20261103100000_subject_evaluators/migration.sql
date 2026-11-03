CREATE TABLE "subject_evaluators" (
  "subjectId" TEXT NOT NULL,
  "evaluatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subject_evaluators_pkey" PRIMARY KEY ("subjectId", "evaluatorId"),
  CONSTRAINT "subject_evaluators_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "subject_evaluators_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "subject_evaluators_evaluatorId_idx" ON "subject_evaluators"("evaluatorId");
