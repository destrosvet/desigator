-- Fields used by student matching and the legacy importer.
ALTER TABLE "users" ADD COLUMN "legacyId" INTEGER;
ALTER TABLE "users" ADD COLUMN "externalId" TEXT;
ALTER TABLE "tasks" ADD COLUMN "legacyId" INTEGER;
ALTER TABLE "subjects" ADD COLUMN "code" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "users_externalId_key" ON "users"("externalId");
