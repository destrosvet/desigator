import { expect, test, type Page } from "@playwright/test";
test.skip(process.env.E2E_WORKFLOW !== "true", "Requires isolated seeded database");
async function login(page: Page, email: string, password: string) {
  await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill(password); await page.getByRole("button", { name: /přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/);
}
test("teacher persists and clears institution in own profile", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL }); const studentContext = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage(); await login(page, "teacher@desigator.cz", "teacher123");
    await page.goto("/cs/settings?section=profile");
    const field = page.getByRole("textbox", { name: "Škola nebo instituce", exact: true });
    await expect(field).toBeEnabled();
    await field.fill("  Střední umělecká škola Praha  ");
    await page.getByRole("button", { name: "Uložit instituci", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Škola nebo instituce byla uložena.");
    await page.reload(); await expect(field).toHaveValue("Střední umělecká škola Praha");
    expect((await page.request.patch("/api/profile", { data: { institution: "a".repeat(301) } })).status()).toBe(400);
    expect((await page.request.patch("/api/profile", { data: { institution: "Cizí", id: "someone-else" } })).status()).toBe(400);
    const student = await studentContext.newPage(); await login(student, "student1@desigator.cz", "student123");
    expect((await student.request.patch("/api/profile", { data: { institution: "Cizí změna" } })).status()).toBe(403);
    await student.goto("/cs/settings?section=profile"); await expect(student.getByRole("textbox", { name: "Škola nebo instituce", exact: true })).toHaveCount(0);
    await field.fill(""); await page.getByRole("button", { name: "Uložit instituci", exact: true }).click();
    await expect(page.getByRole("status")).toBeVisible(); await page.reload(); await expect(field).toHaveValue("");
    expect((await (await page.request.get("/api/profile")).json()).profile.institution).toBeNull();
  } finally { await context.close(); await studentContext.close(); }
});
