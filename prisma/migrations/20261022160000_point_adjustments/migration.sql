CREATE TABLE "point_adjustments" (
"id" TEXT NOT NULL, "subjectId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "amountCents" INTEGER NOT NULL, "reason" TEXT NOT NULL, "visibleToStudent" BOOLEAN NOT NULL DEFAULT false, "requestId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "revokedById" TEXT, CONSTRAINT "point_adjustments_pkey" PRIMARY KEY ("id"), CONSTRAINT "point_adjustments_amount_check" CHECK ("amountCents" <> 0 AND abs("amountCents") <= 1000000));
CREATE UNIQUE INDEX "point_adjustments_requestId_key" ON "point_adjustments"("requestId");
CREATE INDEX "point_adjustments_subjectId_studentId_idx" ON "point_adjustments"("subjectId","studentId");
ALTER TABLE "point_adjustments" ADD CONSTRAINT "point_adjustments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "point_adjustments" ADD CONSTRAINT "point_adjustments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "point_adjustments" ADD CONSTRAINT "point_adjustments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "point_adjustments" ADD CONSTRAINT "point_adjustments_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
