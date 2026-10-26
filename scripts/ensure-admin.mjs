import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";

  if (!email && !password) {
    const existingAdmin = await prisma.user.findFirst({
      where: { OR: [{ role: "ADMIN" }, { roles: { has: "ADMIN" } }] },
      select: { id: true },
    });
    if (existingAdmin) {
      console.log("An administrator already exists; automatic bootstrap is not configured.");
      return;
    }
    throw new Error("A fresh database requires ADMIN_EMAIL and ADMIN_PASSWORD.");
  }
  if (!validEmail(email)) throw new Error("ADMIN_EMAIL must contain a valid email address.");
  if (password.length < 12 || password.length > 72 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("ADMIN_PASSWORD must be 12 to 72 characters and at most 72 UTF-8 bytes.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { role: true, roles: true },
  });
  if (existing) {
    if (existing.role !== "ADMIN" && !existing.roles.includes("ADMIN")) {
      throw new Error(`ADMIN_EMAIL ${email} is already used by a non-administrator account.`);
    }
    console.log(`Administrator ${email} already exists; leaving the account unchanged.`);
    return;
  }

  await prisma.user.create({
    data: { email, name, password: await bcrypt.hash(password, 12), role: "ADMIN", roles: ["ADMIN"] },
  });
  console.log(`Administrator ${email} created.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
