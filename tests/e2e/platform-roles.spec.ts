import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
test.skip(process.env.E2E_PLATFORM_ROLES !== "true", "Requires an isolated organization test database");
test("a platform administrator can also be school administrator, teacher and evaluator", async ({ page }) => {
  const url = process.env.E2E_PLATFORM_DATABASE_URL || "";
  if (!/^\/desigator_organizations_(preview_test|test)$/.test(new URL(url).pathname) && !(process.env.CI && new URL(url).pathname === "/desigator_ci")) throw new Error("Combined-role fixture requires an isolated organization test database");
  const db = new PrismaClient({ datasourceUrl: url });
  const email = "combined-platform-" + Date.now() + "@example.test";
  const user = await db.user.create({ data: { name: "Combined administrator", email, password: await bcrypt.hash("CombinedRole123!", 12), role: "ADMIN", roles: ["ADMIN", "SCHOOL_ADMIN", "TEACHER", "EVALUATOR"], organizationId: "legacy" } });
  try {
    await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill("CombinedRole123!"); await page.getByRole("button", { name: /přihlásit/i }).click(); await page.waitForURL(/dashboard/);
    await page.goto("/cs/settings");
    await expect(page.getByRole("tab", { name: "Organizace", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Působení ve škole", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Moje šablony", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Působení ve škole", exact: true }).click();
    await expect(page.getByText("Školní oprávnění:", { exact: false })).toContainText("Správce školy, Učitel, Hodnotitel");
    const session = await (await page.request.get("/api/auth/session")).json();
    expect(session.user.roles).toEqual(["ADMIN", "SCHOOL_ADMIN", "TEACHER", "EVALUATOR"]);
    expect((await page.request.get("/api/admin/organizations")).status()).toBe(200);
    await page.goto("/cs/evaluations"); await expect(page).not.toHaveURL(/auth\/login/);
  } finally { await db.user.delete({ where: { id: user.id } }); await db.$disconnect(); }
});
