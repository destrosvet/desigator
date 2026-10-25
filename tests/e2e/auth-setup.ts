import { chromium, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
export const teacherStatePath = path.resolve(".next/e2e-auth/teacher.json");
export default async function setup(config: FullConfig) {
  if (process.env.E2E_WORKFLOW !== "true" && process.env.E2E_MEDIA !== "true") return;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL: config.projects[0].use.baseURL });
    await page.goto("/cs/auth/login");
    await page.getByLabel(/e-mail/i).fill("teacher@desigator.cz"); await page.getByLabel(/heslo/i).fill("teacher123");
    await page.getByRole("button", { name: /přihlásit/i }).click(); await page.waitForURL(/dashboard/);
    await mkdir(path.dirname(teacherStatePath), { recursive: true });
    await page.context().storageState({ path: teacherStatePath });
  } finally { await browser.close(); }
}
