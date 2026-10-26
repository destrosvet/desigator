CREATE TABLE "historical_imports" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "sourceHash" TEXT NOT NULL, "sourceName" TEXT NOT NULL, "report" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "historical_imports_organizationId_sourceHash_key" ON "historical_imports"("organizationId", "sourceHash");
CREATE TABLE "historical_courses" (
 "id" TEXT PRIMARY KEY, "importId" TEXT NOT NULL REFERENCES "historical_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "legacyId" INTEGER NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "year" INTEGER, "semester" TEXT NOT NULL,
 "teacherId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "historical_courses_importId_legacyId_key" ON "historical_courses"("importId", "legacyId");
CREATE INDEX "historical_courses_teacherId_idx" ON "historical_courses"("teacherId");
CREATE TABLE "historical_tasks" (
 "id" TEXT PRIMARY KEY, "importId" TEXT NOT NULL REFERENCES "historical_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "legacyId" INTEGER NOT NULL, "courseId" TEXT REFERENCES "historical_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "title" TEXT NOT NULL, "maxPoints" INTEGER
);
CREATE UNIQUE INDEX "historical_tasks_importId_legacyId_key" ON "historical_tasks"("importId", "legacyId");
CREATE INDEX "historical_tasks_courseId_idx" ON "historical_tasks"("courseId");
CREATE TABLE "historical_ratings" (
 "id" TEXT PRIMARY KEY, "taskId" TEXT NOT NULL REFERENCES "historical_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "studentLegacyId" INTEGER NOT NULL, "evaluatorLegacyId" INTEGER NOT NULL, "studentName" TEXT NOT NULL, "evaluatorName" TEXT NOT NULL,
 "points" INTEGER NOT NULL, "feedback" TEXT NOT NULL, "sourceDate" TEXT NOT NULL
);
CREATE UNIQUE INDEX "historical_ratings_taskId_studentLegacyId_evaluatorLegacyId_key" ON "historical_ratings"("taskId", "studentLegacyId", "evaluatorLegacyId");
CREATE INDEX "historical_ratings_taskId_idx" ON "historical_ratings"("taskId");
