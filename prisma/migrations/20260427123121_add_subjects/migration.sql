/*
  Warnings:

  - You are about to drop the `task_assignments` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `subjectId` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SemesterType" AS ENUM ('FULL_YEAR', 'SUMMER', 'WINTER');

-- DropForeignKey
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_classId_fkey";

-- DropForeignKey
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_taskId_fkey";

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "subjectId" TEXT NOT NULL;

-- DropTable
DROP TABLE "task_assignments";

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "semester" "SemesterType" NOT NULL DEFAULT 'FULL_YEAR',
    "year" INTEGER NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subjects_classId_idx" ON "subjects"("classId");

-- CreateIndex
CREATE INDEX "subjects_teacherId_idx" ON "subjects"("teacherId");

-- CreateIndex
CREATE INDEX "subjects_year_idx" ON "subjects"("year");

-- CreateIndex
CREATE INDEX "subjects_semester_idx" ON "subjects"("semester");

-- CreateIndex
CREATE INDEX "tasks_subjectId_idx" ON "tasks"("subjectId");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
