import { emailSchema, newPasswordSchema } from "../src/lib/password-policy";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || !emailSchema.safeParse(email).success || !newPasswordSchema.safeParse(password).success) {
    throw new Error("Set a valid ADMIN_EMAIL and ADMIN_PASSWORD (12 characters minimum, 72 UTF-8 bytes maximum).");
  }
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error("Account already exists; it has not been modified.");
  await prisma.user.create({
    data: { email, name: process.env.ADMIN_NAME || "Administrátor", password: await bcrypt.hash(password, 12), role: "ADMIN" },
  });
  console.log("Administrator created.");
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
