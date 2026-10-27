import { chromium, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { demoAccounts, demoStatePath } from "./demo-auth";
export const teacherStatePath = demoStatePath("teacher");
export default async function setup(config: FullConfig) {
  if (!["E2E_WORKFLOW", "E2E_MEDIA", "E2E_STATISTICS"].some(key => process.env[key] === "true")) return;
  const browser = await chromium.launch();
  try {
    await mkdir(path.dirname(teacherStatePath), { recursive: true });
    for (const account of demoAccounts) {
      const context = await browser.newContext({ baseURL: config.projects[0].use.baseURL });
      try {
        const page = await context.newPage();
        await page.goto("/cs/auth/login");
        await page.getByLabel(/e-mail/i).fill(account.email);
        await page.getByLabel(/heslo/i).fill(account.password);
        await page.getByRole("button", { name: /přihlásit/i }).click();
        await page.waitForURL(/dashboard/);
        await context.storageState({ path: demoStatePath(account.key) });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
