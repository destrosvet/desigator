import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const demoAccounts = [
  { key: "teacher", email: "teacher@desigator.cz", password: "teacher123" },
  { key: "student1", email: "student1@desigator.cz", password: "student123" },
  { key: "student2", email: "student2@desigator.cz", password: "student123" },
  { key: "evaluator", email: "evaluator@desigator.cz", password: "evaluator123" },
] as const;
export const demoStatePath = (key: string) => path.resolve(".next/e2e-auth", key + ".json");
// Reuse real sessions established by global setup; keep the application's login limit enabled.
export async function restoreDemoSession(page: Page, email: string, password: string) {
  const account = demoAccounts.find(account => account.email === email && account.password === password);
  if (!account) return false;
  const state = JSON.parse(await readFile(demoStatePath(account.key), "utf8"));
  await page.context().addCookies(state.cookies);
  await page.goto("/cs/dashboard");
  return true;
}
