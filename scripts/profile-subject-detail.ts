import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";

// Read-only profile. Never print database URLs, account details or query values.
async function main() {
  loadEnvConfig(process.cwd());
  const db = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
  Object.assign(globalThis, { prisma: db });
  const { readSubjectDetail } = await import("../src/lib/subject-detail");
  const { visibleSubjectScope, visibleTaskScope, managedClassScope } = await import("../src/lib/authorization");
  let queries = 0; let databaseMs = 0;
  db.$on("query", event => { queries++; databaseMs += event.duration; });
  async function measure<T>(label: string, run: () => Promise<T>) {
    queries = 0; databaseMs = 0; const start = performance.now();
    const result = await run();
    console.log(JSON.stringify({ label, wallMs: Math.round(performance.now() - start), queries, databaseMs, bytes: Buffer.byteLength(JSON.stringify(result)) }));
    return result;
  }
  try {
    const start = performance.now(); await db.$connect(); console.log(JSON.stringify({ label: "connect", wallMs: Math.round(performance.now() - start) }));
    const subject = await db.subject.findFirst({ select: { id: true, teacher: { select: { id: true, role: true, roles: true, organizationId: true } } } });
    if (!subject) { console.log("No subjects available for profiling"); return; }
    for (let sample = 0; sample < 3; sample++) {
      await measure("legacy-permission-check", () => db.subject.findFirst({ where: { id: subject.id, ...visibleSubjectScope(subject.teacher) }, select: { id: true } }));
      await measure("legacy-detail", () => db.subject.findUnique({ where: { id: subject.id }, include: { classes: { select: { classId: true, class: { select: { id: true, name: true, organizationId: true } } } }, teacher: { select: { id: true, name: true } }, tasks: { where: visibleTaskScope(subject.teacher) } } }));
      await measure("legacy-class-options", () => Promise.all([db.class.findMany({ where: managedClassScope(subject.teacher), take: 999, include: { teacher: { select: { name: true, email: true } }, _count: { select: { students: true } } } }), db.class.count({ where: managedClassScope(subject.teacher) })]));
      await measure("optimized-detail-with-evaluators", () => readSubjectDetail(subject.teacher, subject.id));
      await measure("minimal-class-options", () => db.class.findMany({ where: managedClassScope(subject.teacher), select: { id: true, name: true } }));
    }
  } finally { await db.$disconnect(); }
}
main().catch((error: unknown) => { console.error("Profiling failed:", error instanceof Error ? error.name : "unknown error", typeof error === "object" && error && "errorCode" in error ? error.errorCode : "", ". No connection details logged."); process.exitCode = 1; });
