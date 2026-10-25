import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
 if (!process.env.CI || new URL(process.env.DATABASE_URL || "").pathname !== "/desigator_ci") throw new Error("Synthetic statistics fixture requires an isolated CI database");
 const importId = "synthetic-statistics-e2e";
 await db.historicalImport.upsert({ where: { id: importId }, update: {}, create: { id: importId, organizationId: "legacy", sourceName: "synthetic-statistics-fixture", sourceHash: importId, report: { users: 10023, courses: 2, tasks: 2, ratings: 10328, unknownStudents: 305, unknownEvaluators: 0, coursesWithoutYear: 0, tasksWithoutCourse: 0, missingTaskIds: [], scoresOutsideScale: 0 } } });
 for (let index = 0; index < 2; index++) {
  const courseId = importId + "-course-" + index; const taskId = importId + "-task-" + index;
  await db.historicalCourse.upsert({ where: { id: courseId }, update: {}, create: { id: courseId, importId, legacyId: index + 1, code: index ? "YGD-B" : "YPG-A", name: index ? "Synthetic graphic design" : "Synthetic computer graphics", year: index ? 2014 : 2013, semester: "WINTER" } });
  await db.historicalTask.upsert({ where: { id: taskId }, update: {}, create: { id: taskId, importId, courseId, legacyId: index + 1, title: "Synthetic design assignment " + index, maxPoints: 100 } });
  for (let offset = 0; offset < 5164; offset += 500) await db.historicalRating.createMany({ skipDuplicates: true, data: Array.from({ length: Math.min(500, 5164 - offset) }, (_, item) => ({ id: taskId + "-rating-" + (offset + item), taskId, studentLegacyId: offset + item + 1, evaluatorLegacyId: 1, studentName: "Synthetic student " + (offset + item + 1), evaluatorName: "Synthetic reviewer", points: (offset + item) % 101, feedback: "Synthetic fixture feedback", sourceDate: "2013-10-01" })) });
 }
 console.log("Synthetic historical fixture ready (10328 ratings, no private source data)");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
