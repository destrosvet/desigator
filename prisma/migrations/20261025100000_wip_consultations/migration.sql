CREATE TABLE "consultation_comments" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consultation_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "consultation_comments_submissionId_createdAt_idx" ON "consultation_comments"("submissionId", "createdAt");
ALTER TABLE "consultation_comments" ADD CONSTRAINT "consultation_comments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consultation_comments" ADD CONSTRAINT "consultation_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
