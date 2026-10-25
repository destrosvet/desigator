ALTER TYPE "UserRole" ADD VALUE 'SCHOOL_ADMIN';
CREATE TABLE "organizations" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
INSERT INTO "organizations" ("id", "name") VALUES ('legacy', 'Původní organizace Desigator');
ALTER TABLE "users" ADD COLUMN "roles" "UserRole"[] NOT NULL DEFAULT ARRAY[]::"UserRole"[], ADD COLUMN "organizationId" TEXT;
UPDATE "users" SET "roles" = CASE WHEN "role" = 'TEACHER' THEN ARRAY['TEACHER','EVALUATOR']::"UserRole"[] ELSE ARRAY["role"] END;
UPDATE "users" SET "organizationId" = 'legacy' WHERE "role" IN ('ADMIN','TEACHER','STUDENT');
ALTER TABLE "classes" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "classes" ADD CONSTRAINT "classes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX "classes_organizationId_idx" ON "classes"("organizationId");
CREATE TABLE "organization_invitations" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "email" TEXT NOT NULL, "roles" "UserRole"[] NOT NULL,
  "tokenHash" TEXT NOT NULL, "createdById" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_invitations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "organization_invitations_tokenHash_key" ON "organization_invitations"("tokenHash");
CREATE INDEX "organization_invitations_organizationId_idx" ON "organization_invitations"("organizationId");

DROP INDEX "users_externalId_key";
CREATE UNIQUE INDEX "users_organizationId_externalId_key" ON "users"("organizationId", "externalId");
