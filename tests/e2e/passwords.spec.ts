import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
test.skip(process.env.E2E_PASSWORDS !== "true", "Requires an isolated password test database");
async function login(page: Page, email: string, password: string) {
 await page.goto("/cs/auth/login"); await page.getByLabel("E-mail", { exact: true }).fill(email); await page.getByLabel("Heslo", { exact: true }).fill(password); await page.getByRole("button", { name: /Přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/);
}
test("password change and one-use reset revoke sessions on every device", async ({ browser, baseURL }, testInfo) => {
 test.setTimeout(120000);
 const url = process.env.E2E_PASSWORDS_DATABASE_URL || "";
 if (!/^\/desigator_passwords_(check|test)$/.test(new URL(url).pathname) && !(process.env.CI && new URL(url).pathname === "/desigator_ci")) throw new Error("Requires isolated password database");
 const db = new PrismaClient({ datasourceUrl: url });
 const first = await browser.newContext({ baseURL }); const second = await browser.newContext({ baseURL });
 const suffix = randomBytes(6).toString("hex"); const email = "password-" + suffix + "@example.cz";
 const original = "Original-password-123"; const changed = "Changed-password-123"; const recovered = "Recovered-password-123";
 const user = await db.user.create({ data: { name: "Password E2E", email, password: await bcrypt.hash(original, 12), role: "STUDENT", roles: ["STUDENT"], organizationId: "legacy" } });
 try {
   const page = await first.newPage(); const other = await second.newPage();
   await login(page, email, original); await login(other, email, original);
   await page.goto("/cs/settings?section=profile");
   await expect(page.getByLabel("Současné heslo", { exact: true })).toBeVisible();
   await page.screenshot({ path: testInfo.outputPath("password-settings.png"), fullPage: true });
   await page.getByLabel("Současné heslo", { exact: true }).fill("wrong"); await page.getByLabel("Nové heslo", { exact: true }).fill(changed); await page.getByLabel("Potvrzení nového hesla", { exact: true }).fill(changed);
   await page.getByRole("button", { name: "Změnit heslo a odhlásit se" }).click(); await expect(page.locator('p[role="alert"]')).toContainText("Současné heslo není správné");
   await page.getByLabel("Současné heslo", { exact: true }).fill(original); await page.getByRole("button", { name: "Změnit heslo a odhlásit se" }).click(); await expect(page).toHaveURL(/auth\/login/);
   expect(await (await other.request.get("/api/auth/session")).json()).toBeNull();
   await login(page, email, changed);
   const token = randomBytes(32).toString("hex"); const current = await db.user.findUniqueOrThrow({ where: { id: user.id } });
   await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), sessionVersion: current.sessionVersion, expiresAt: new Date(Date.now() + 600000) } });
   await other.setViewportSize({ width: 390, height: 844 });
   await other.goto("/en/auth/reset-password#token=" + token);
   await other.screenshot({ path: testInfo.outputPath("password-reset-mobile.png"), fullPage: true });
   await other.getByLabel("New password", { exact: true }).fill(recovered); await other.getByLabel("Confirm new password", { exact: true }).fill(changed); await other.getByRole("button", { name: "Save new password" }).click(); await expect(other.locator('p[role="alert"]')).toContainText("do not match");
   await other.getByLabel("Confirm new password", { exact: true }).fill(recovered); await other.getByRole("button", { name: "Save new password" }).click(); await expect(other.getByRole("status")).toContainText("password has been changed"); expect(other.url()).not.toContain("#");
   expect(await (await page.request.get("/api/auth/session")).json()).toBeNull();
   expect((await page.request.post("/api/auth/reset-password", { data: { token, password: changed } })).status()).toBe(400);
   await login(other, email, recovered);
   expect(await db.passwordResetToken.count({ where: { userId: user.id } })).toBe(0);
   await other.goto("/cs/auth/login"); await other.getByRole("link", { name: "Zapomněli jste heslo?" }).click(); await expect(other.getByRole("heading", { name: "Zapomenuté heslo" })).toBeVisible();
   await other.getByLabel("E-mail", { exact: true }).fill("unknown@example.cz"); await other.getByRole("button", { name: "Poslat odkaz na obnovu" }).click(); await expect(other.locator('p[role="alert"]')).toContainText("Obnova hesla nyní není dostupná");
 } finally { await first.close(); await second.close(); await db.passwordResetToken.deleteMany({ where: { userId: user.id } }); await db.user.delete({ where: { id: user.id } }); await db.$disconnect(); }
});
