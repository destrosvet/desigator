CREATE TABLE "assignment_templates" (
"id" TEXT NOT NULL, "creatorId" TEXT NOT NULL, "title" TEXT NOT NULL,
"description" TEXT, "instructions" TEXT, "maxPoints" INTEGER NOT NULL DEFAULT 100,
"criteria" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "assignment_templates_pkey" PRIMARY KEY ("id"),
CONSTRAINT "assignment_templates_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "assignment_templates_creatorId_idx" ON "assignment_templates"("creatorId");
