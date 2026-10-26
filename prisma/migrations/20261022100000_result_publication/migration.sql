-- Every result remains private until an authorized teacher explicitly publishes it.
ALTER TABLE "submissions" ADD COLUMN "resultsPublishedAt" TIMESTAMP(3), ADD COLUMN "resultsPublishedById" TEXT;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_resultsPublishedById_fkey" FOREIGN KEY ("resultsPublishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
