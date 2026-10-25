import { teacherStatePath } from "./auth-setup";
import { expect, test, type Page } from "@playwright/test";
test.skip(process.env.E2E_WORKFLOW !== "true", "Requires isolated seeded database");
async function login(page: Page, email = "teacher@desigator.cz", password = "teacher123") {
  await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill(password); await page.getByRole("button", { name: /přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/);
}
test("shared columns persist per table and account; server sorting covers all pages", async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  const context = await browser.newContext({ baseURL, storageState: teacherStatePath });
  try {
    const page = await context.newPage();
    const subjects = (await (await page.request.get("/api/subjects?limit=999")).json()).subjects;
    const prefix = "E2E pořadí " + Date.now() + " ";
    for (let i = 1; i <= 22; i++) {
      expect((await page.request.post("/api/tasks", { data: { title: prefix + String(i).padStart(2, "0"), subjectId: subjects[0].id } })).status()).toBe(201);
    }
    await page.goto("/cs/tasks");
    await page.getByRole("textbox", { name: "Vyhledat zadání…" }).fill(prefix);
    await page.getByRole("button", { name: "Hledat", exact: true }).click();
    await expect(page.getByText("Zobrazeno 20 z 22", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Další stránka", exact: true }).click();
    await expect(page.getByText("Strana 2 z 2", { exact: true })).toBeVisible();
    const ascending = page.waitForResponse((res) => res.url().includes("/api/tasks?") && res.url().includes("sort=title") && res.url().includes("order=asc"));
    await page.getByRole("button", { name: "Řadit podle: Název", exact: true }).click();
    expect((await ascending).status()).toBe(200);
    await expect(page.getByText("Strana 1 z 2", { exact: true })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toContainText(prefix + "01");
    await expect(page.getByRole("columnheader", { name: "Řadit podle: Název" })).toHaveAttribute("aria-sort", "ascending");
    await page.getByRole("button", { name: "Řadit podle: Název", exact: true }).click();
    await expect(page.locator("tbody tr").first()).toContainText(prefix + "22");
    await page.getByRole("button", { name: "Sloupce", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: "Předmět", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("columnheader", { name: "Řadit podle: Předmět", exact: true })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Akce", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Sloupce", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Řadit podle: Předmět", exact: true })).toHaveCount(0);
    await page.goto("/cs/students"); await expect(page.getByRole("columnheader", { name: "Řadit podle: E-mail", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Řadit podle: Jméno", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "Řadit podle: Jméno", exact: true })).toHaveAttribute("aria-sort", "ascending");
    await page.goto("/cs/tasks"); await page.getByRole("button", { name: "Sloupce", exact: true }).click();
    for (const label of ["Název", "Třída", "Termín", "Stav"]) await page.getByRole("menuitemcheckbox", { name: label, exact: true }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: "Odevzdání", exact: true })).toBeDisabled();
    await page.getByRole("menuitem", { name: "Zobrazit všechny", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "Řadit podle: Předmět", exact: true })).toBeVisible();
    // Every server column, including nested and computed fields, accepts both directions.
    for (const [entity, keys] of [["tasks", ["title", "subject", "class", "deadline", "status", "submissions"]], ["subjects", ["code", "name", "class", "semester", "year", "teacher", "tasks"]], ["students", ["name", "email", "externalId", "classes"]]] as const) {
      for (const key of keys) for (const order of ["asc", "desc"]) {
        const response = await page.request.get("/api/" + entity + "?sort=" + key + "&order=" + order + "&limit=2");
        expect(response.status(), entity + ":" + key + ":" + order).toBe(200);
      }
    }
    await page.goto("/cs/tasks"); await page.getByRole("button", { name: "Sloupce", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: "Předmět", exact: true }).click(); await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Uživatelské menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Odhlásit se", exact: true }).click();
    await expect(page).toHaveURL(/auth\/login/);
    await login(page, "admin@desigator.cz", "admin123");
    await page.goto("/cs/tasks"); await expect(page.getByRole("columnheader", { name: "Řadit podle: Předmět", exact: true })).toBeVisible();
  } finally { await context.close(); }
});
test("local tables sort the complete list before pagination", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, storageState: teacherStatePath });
  try {
    const page = await context.newPage();
    const prefix = "E2E sloupce " + Date.now() + " ";
    for (let i = 1; i <= 22; i++) expect((await page.request.post("/api/task-templates", { data: { title: prefix + String(i).padStart(2, "0"), maxPoints: i, criteria: [{ name: "Body", maxPoints: i }] } })).status()).toBe(201);
    await page.goto("/cs/settings?section=templates");
    await page.getByRole("textbox", { name: "Vyhledat šablonu…" }).fill(prefix);
    await page.getByRole("button", { name: "Hledat", exact: true }).click();
    await expect(page.getByText("Zobrazeno 20 z 22", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Řadit podle: Maximum bodů", exact: true }).click();
    await expect(page.locator("tbody tr").first()).toContainText(prefix + "01");
    await page.getByRole("button", { name: "Další stránka", exact: true }).click();
    await expect(page.locator("tbody tr").first()).toContainText(prefix + "21");
    await page.getByRole("button", { name: "Řadit podle: Maximum bodů", exact: true }).click();
    await expect(page.getByText("Strana 1 z 2", { exact: true })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toContainText(prefix + "22");
    await page.getByRole("button", { name: "Řadit podle: Maximum bodů", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "Řadit podle: Maximum bodů", exact: true })).toHaveAttribute("aria-sort", "none");
  } finally { await context.close(); }
});
