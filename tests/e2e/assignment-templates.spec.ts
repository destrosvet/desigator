import { expect, test, type Page } from "@playwright/test";
test.skip(process.env.E2E_WORKFLOW !== "true", "Requires isolated seeded database");
async function login(page: Page, email: string, password: string) {
  await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill(password); await page.getByRole("button", { name: /přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/);
}
test("personal templates in settings copy criteria into independent assignments", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL }); const foreign = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage(); await login(page, "teacher@desigator.cz", "teacher123");
    await page.goto("/cs/settings?section=templates"); await page.getByRole("button", { name: "Nová šablona", exact: true }).click();
    const editor = page.getByRole("form", { name: "Úprava zadání" }); const title = "E2E šablona " + Date.now();
    await editor.getByLabel("Název zadání", { exact: true }).fill(title);
    await editor.getByLabel("Pokyny k práci", { exact: true }).fill("Odevzdejte zdrojový soubor a náhled.");
    await editor.getByLabel("Název kritéria 1", { exact: true }).fill("Kompozice");
    await editor.getByRole("button", { name: "Uložit šablonu", exact: true }).click(); await expect(editor).toBeHidden();
    const template = (await (await page.request.get("/api/task-templates")).json()).templates.find((item: { title: string }) => item.title === title);
    expect(template).toBeTruthy();
    const admin = await foreign.newPage(); await login(admin, "admin@desigator.cz", "admin123");
    expect((await (await admin.request.get("/api/task-templates")).json()).templates.some((item: { id: string }) => item.id === template.id)).toBe(false);
    expect((await admin.request.patch("/api/task-templates", { data: { ...template, title: "Cizí změna" } })).status()).toBe(404);
    expect((await admin.request.delete("/api/task-templates", { data: { ids: [template.id], confirmed: true } })).status()).toBe(404);
    await page.goto("/cs/tasks"); await page.getByRole("button", { name: "Nové zadání", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Šablona zadání", exact: true }).click(); await page.getByRole("option", { name: title, exact: true }).click();
    await expect(dialog.getByRole("textbox").first()).toHaveValue(title);
    await expect(dialog.getByText(/Převzatá kritéria: Kompozice/)).toBeVisible();
    await dialog.getByRole("combobox", { name: "Předmět", exact: true }).click(); await page.getByRole("option").first().click();
    const created = page.waitForResponse((res) => res.url().endsWith("/api/tasks") && res.request().method() === "POST");
    await dialog.getByRole("button", { name: "Vytvořit", exact: true }).click();
    const task = (await (await created).json()).task;
    expect(task.instructions).toBe(template.instructions); expect(task.criteria[0].name).toBe("Kompozice");
    expect(task.deadline).toBeNull(); expect(task.status).toBe("DRAFT");
    await page.goto("/cs/settings?section=templates"); await page.getByRole("row", { name: "Otevřít: " + title, exact: true }).click();
    await editor.getByLabel("Pokyny k práci", { exact: true }).fill("Nové pokyny");
    await editor.getByRole("button", { name: "Uložit šablonu", exact: true }).click(); await expect(editor).toBeHidden();
    expect((await (await page.request.get("/api/tasks/" + task.id)).json()).task.instructions).toBe(template.instructions);
    await page.getByRole("button", { name: "Smazat: " + title, exact: true }).click();
    await page.getByRole("button", { name: "Zrušit", exact: true }).click();
    await expect(page.getByRole("row", { name: "Otevřít: " + title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Smazat: " + title, exact: true }).click();
    await page.getByRole("button", { name: "Potvrdit smazání", exact: true }).click();
    await expect(page.getByRole("row", { name: "Otevřít: " + title, exact: true })).toBeHidden();
    expect((await (await page.request.get("/api/tasks/" + task.id)).json()).task.criteria[0].name).toBe("Kompozice");
  } finally { await context.close(); await foreign.close(); }
});
