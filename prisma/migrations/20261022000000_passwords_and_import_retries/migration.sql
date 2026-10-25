ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE TABLE "bulk_submission_imports" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bulk_submission_imports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bulk_submission_imports_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "bulk_submission_imports_taskId_fingerprint_key" ON "bulk_submission_imports"("taskId", "fingerprint");
