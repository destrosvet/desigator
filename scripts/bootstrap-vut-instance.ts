import { spawnSync } from "node:child_process";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { emailSchema, newPasswordSchema } from "../src/lib/password-policy";

const prisma = new PrismaClient();
const organizationId = "vut-fsi-industrial-design";
const organizationName = "Fakulta strojního inženýrství VUT v Brně – Odbor průmyslového designu";
const importFile = process.env.LEGACY_IMPORT_FILE || "/bootstrap/desigator-export.sql";

function credentials(prefix: "ADMIN" | "DEFAULT_TEACHER") {
  const email = process.env[`${prefix}_EMAIL`]?.trim().toLowerCase();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !emailSchema.safeParse(email).success) throw new Error(`${prefix}_EMAIL is missing or invalid.`);
  if (!password || !newPasswordSchema.safeParse(password).success) throw new Error(`${prefix}_PASSWORD must contain 12-72 UTF-8 bytes.`);
  return { email, password };
}

async function main() {
  const admin = credentials("ADMIN");
  const teacher = credentials("DEFAULT_TEACHER");
  if (admin.email === teacher.email) throw new Error("Administrator and teacher must be different accounts.");

  const teacherId = await prisma.$transaction(async (tx) => {
    await tx.organization.upsert({ where: { id: organizationId }, update: {}, create: { id: organizationId, name: organizationName } });
    const existingAdmin = await tx.user.findUnique({ where: { email: admin.email } });
    if (existingAdmin && existingAdmin.role !== UserRole.ADMIN && !existingAdmin.roles.includes(UserRole.ADMIN)) throw new Error("ADMIN_EMAIL is already used by a non-administrator.");
    if (!existingAdmin) await tx.user.create({ data: { email: admin.email, name: process.env.ADMIN_NAME || "Administrátor", password: await bcrypt.hash(admin.password, 12), role: UserRole.ADMIN, roles: [UserRole.ADMIN] } });

    const existingTeacher = await tx.user.findUnique({ where: { email: teacher.email } });
    if (existingTeacher && existingTeacher.organizationId !== organizationId) throw new Error("DEFAULT_TEACHER_EMAIL is already used outside the target school.");
    const owner = existingTeacher || await tx.user.create({ data: { email: teacher.email, name: process.env.DEFAULT_TEACHER_NAME || "Správce oboru průmyslový design", password: await bcrypt.hash(teacher.password, 12), role: UserRole.TEACHER, roles: [UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.EVALUATOR], organizationId } });
    if (!(owner.roles.length ? owner.roles : [owner.role]).includes(UserRole.TEACHER)) throw new Error("DEFAULT_TEACHER_EMAIL does not have the teacher role.");
    return owner.id;
  });

  const imported = spawnSync("./node_modules/.bin/tsx", ["prisma/seed-legacy.ts", "--organization-id", organizationId, "--file", importFile, "--source-name", "desigator-export.sql", "--apply"], { stdio: "inherit" });
  if (imported.status !== 0) throw new Error(`Historical import failed with exit code ${imported.status ?? "unknown"}.`);
  const assigned = await prisma.historicalCourse.updateMany({ where: { import: { organizationId }, teacherId: null }, data: { teacherId } });
  console.log(JSON.stringify({ organizationId, teacherId, assignedHistoricalCourses: assigned.count }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
