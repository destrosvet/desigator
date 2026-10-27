ALTER TABLE "tasks" ADD COLUMN "resultsPublishedAt" TIMESTAMP(3), ADD COLUMN "resultsPublishedById" TEXT;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_resultsPublishedById_fkey" FOREIGN KEY ("resultsPublishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
