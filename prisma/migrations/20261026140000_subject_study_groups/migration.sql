ALTER TABLE "classes" ADD COLUMN "academicYear" INTEGER;
CREATE TABLE "subject_classes" (
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subject_classes_pkey" PRIMARY KEY ("subjectId", "classId")
);
CREATE INDEX "subject_classes_classId_idx" ON "subject_classes"("classId");
ALTER TABLE "subject_classes" ADD CONSTRAINT "subject_classes_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subject_classes" ADD CONSTRAINT "subject_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "subject_classes" ("subjectId", "classId") SELECT "id", "classId" FROM "subjects" ON CONFLICT ("subjectId", "classId") DO NOTHING;
