import { expect, test, type Page } from "@playwright/test";
test.skip(process.env.E2E_WORKFLOW !== "true", "Requires isolated demo database");
async function login(page: Page, email: string, password: string) { await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill(password); await page.getByRole("button", { name: /přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/); }
test("admin tables open editors and confirm single and bulk operations", async ({ browser, baseURL }, testInfo) => {
 test.setTimeout(90000); const context = await browser.newContext({ baseURL });
 try {
  const page = await context.newPage(); await login(page, "teacher@desigator.cz", "teacher123");
  const { subjects } = await (await page.request.get("/api/subjects")).json(); const subject = subjects[0]; const prefix = "E2E tabulky " + Date.now();
  const tasks: Array<{ id: string; title: string }> = [];
  for (let i = 1; i <= 2; i++) { const res = await page.request.post("/api/tasks", { data: { title: prefix + " " + i, subjectId: subject.id, criteria: [{ name: "Provedení", maxPoints: 100 }] } }); expect(res.status()).toBe(201); tasks.push((await res.json()).task); }
  await page.goto("/cs/tasks"); await page.getByRole("textbox", { name: /Vyhledat/ }).fill(prefix); await page.getByRole("button", { name: "Hledat", exact: true }).click();
  await expect(page.getByText(tasks[0].title, { exact: true })).toBeVisible();
  await page.getByLabel("Smazat: " + tasks[0].title, { exact: true }).click(); const confirmation = page.getByRole("alertdialog"); await expect(confirmation).toBeVisible(); await expect(page).toHaveURL(/\/cs\/tasks$/); await confirmation.getByRole("button", { name: "Zrušit", exact: true }).click();
  expect((await page.request.get("/api/tasks/" + tasks[0].id)).status()).toBe(200);
  await page.getByLabel("Vybrat všechny řádky na stránce", { exact: true }).check();
  await page.getByRole("button", { name: "Publikovat vybrané", exact: true }).click(); await confirmation.getByRole("button", { name: "Potvrdit úpravu", exact: true }).click(); await expect(confirmation).toBeHidden();
  for (const task of tasks) expect((await (await page.request.get("/api/tasks/" + task.id)).json()).task.status).toBe("PUBLISHED");
  await page.getByLabel("Vybrat všechny řádky na stránce", { exact: true }).check(); await page.getByRole("button", { name: "Smazat vybrané (2)", exact: true }).click();
  await expect(confirmation.getByText(tasks[0].title, { exact: true })).toBeVisible(); await expect(confirmation.getByText(tasks[1].title, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("bulk-delete-confirmation.png"), fullPage: true });
  await confirmation.getByRole("button", { name: "Potvrdit smazání", exact: true }).click(); await expect(confirmation).toBeHidden(); await expect(page.getByText("Žádné výsledky", { exact: true })).toBeVisible();
  const remaining = await (await page.request.get("/api/tasks?search=" + encodeURIComponent(prefix))).json(); expect(remaining.total).toBe(0);
  // Create a disposable student and put them in this teacher's class.
  const studentName = "E2E student " + Date.now(); const created = await page.request.post("/api/students", { data: { name: studentName, email: "table-" + Date.now() + "@example.test", password: "Student-test-123" } }); expect(created.status()).toBe(201); const { student } = await created.json();
  expect((await page.request.post("/api/classes/" + subject.classId + "/students", { data: { studentId: student.id } })).status()).toBe(201);
  await page.goto("/cs/students"); await page.getByRole("textbox", { name: /Vyhledat/ }).fill(studentName); await page.getByRole("button", { name: "Hledat", exact: true }).click();
  await page.getByRole("row", { name: "Otevřít: " + studentName, exact: true }).press("Enter"); const editor = page.getByRole("dialog", { name: "Upravit studenta" }); await expect(editor).toBeVisible(); const schoolId = "T" + Date.now(); await editor.getByLabel("Školní ID", { exact: true }).fill(schoolId); await editor.getByRole("button", { name: "Uložit studenta", exact: true }).click(); await expect(editor).toBeHidden(); await expect(page.getByText(schoolId, { exact: true })).toBeVisible();
  await page.getByLabel("Smazat: " + studentName, { exact: true }).click(); await confirmation.getByRole("button", { name: "Potvrdit smazání", exact: true }).click(); await expect(confirmation).toBeHidden(); await expect(page.getByText("Žádné výsledky", { exact: true })).toBeVisible();
 } finally { await context.close(); }
});
