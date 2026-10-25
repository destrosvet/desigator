import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  const tables = await db.$queryRaw`SELECT tablename AS table_name FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
  const names = new Set(tables.map((row) => row.table_name));
  if (names.has("users") && !names.has("_prisma_migrations")) throw new Error("Existing unversioned database: verify a backup and baseline manually before deployment.");
  if (names.has("tasks")) {
    const columns = await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks'`;
    if (!columns.some((column) => column.column_name === "subjectId")) throw new Error("Legacy tasks without subjectId: stop and convert task assignments on a restored copy before running migrations.");
  }
  console.log("Migration safety check OK");
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await db.$disconnect(); }
