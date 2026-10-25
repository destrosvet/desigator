CREATE TABLE "results_shares" ("classId" TEXT NOT NULL, "token" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "results_shares_pkey" PRIMARY KEY ("classId"));
CREATE UNIQUE INDEX "results_shares_token_key" ON "results_shares"("token");
ALTER TABLE "results_shares" ADD CONSTRAINT "results_shares_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
