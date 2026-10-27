import { restoreDemoSession } from "./demo-auth";
import { teacherStatePath } from "./auth-setup";
import { expect, test, type Page } from "@playwright/test";
test.skip(process.env.E2E_WORKFLOW !== "true", "Requires isolated seeded database");
async function login(page: Page, email: string, password: string) {
  if (await restoreDemoSession(page, email, password)) return;
 await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill(password); await page.getByRole("button", { name: /přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/);
}
test("teacher defines ordered criteria in the UI and cannot change graded point limits", async ({ browser, baseURL }, testInfo) => {
 test.setTimeout(90000);
 const context = await browser.newContext({ baseURL }); const studentContext = await browser.newContext({ baseURL });
 try {
  const page = await context.newPage(); await login(page, "teacher@desigator.cz", "teacher123");
  await page.goto("/cs/tasks"); await page.getByRole("button", { name: "Nové zadání", exact: true }).click();
  const dialog = page.getByRole("dialog"); const title = "E2E editor " + Date.now(); await dialog.getByRole("textbox").first().fill(title);
  await dialog.getByRole("combobox", { name: "Předmět", exact: true }).click(); await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Vytvořit", exact: true }).click(); await expect(dialog).toBeHidden(); await page.getByText(title, { exact: true }).click();
  await expect(page).toHaveURL(/tasks\/[^/]+$/); const taskId = page.url().split("/").pop()!;
  await page.getByRole("button", { name: "Upravit zadání", exact: true }).click();
  const editor = page.getByRole("form", { name: "Úprava zadání" }); await expect(editor).toBeVisible();
  await editor.getByLabel("Datum termínu odevzdání", { exact: true }).fill("2026-12-01");
  await editor.getByLabel("Popis zadání", { exact: true }).fill("Vytvořte sérii ilustrací.");
  await editor.getByRole("button", { name: "Přidat kritérium", exact: true }).click(); await editor.getByLabel("Název kritéria 1", { exact: true }).fill("Kompozice"); await editor.getByLabel("Body kritéria 1", { exact: true }).fill("60");
  await expect(editor.getByRole("button", { name: "Uložit zadání", exact: true })).toBeDisabled();
  await editor.getByRole("button", { name: "Přidat kritérium", exact: true }).click(); await editor.getByLabel("Název kritéria 2", { exact: true }).fill("Technika");
  await editor.getByRole("button", { name: "Posunout kritérium 2 nahoru", exact: true }).click(); await expect(editor.getByLabel("Název kritéria 1", { exact: true })).toHaveValue("Technika");
  await page.screenshot({ path: testInfo.outputPath("ordered-criteria-editor.png"), fullPage: true });
  await editor.getByRole("button", { name: "Uložit zadání", exact: true }).click(); await expect(editor).toBeHidden();
  const saved = (await (await page.request.get("/api/tasks/" + taskId)).json()).task;
  expect(saved.criteria.map((criterion: { name: string }) => criterion.name)).toEqual(["Technika", "Kompozice"]); expect(saved.criteria.map((criterion: { maxPoints: number }) => criterion.maxPoints)).toEqual([40, 60]); expect(saved.deadline).toBeTruthy();
  await page.getByRole("button", { name: "Publikovat", exact: true }).click(); await expect(page.getByText("Publikováno", { exact: true })).toBeVisible();
  const student = await studentContext.newPage(); await login(student, "student1@desigator.cz", "student123");
  const submitted = await student.request.post("/api/submissions", { multipart: { taskId, content: "Moje práce", stage: "FINAL" } }); expect(submitted.status()).toBe(201); const { submission } = await submitted.json();
  await page.goto("/cs/tasks/" + taskId);
  await page.getByRole("button", { name: "Hodnotit práce", exact: true }).click();
  await expect(page).toHaveURL(/\/evaluations\/[^/]+$/);
  const evaluationId = page.url().split("/").pop()!;
  const { evaluation } = await (await page.request.get("/api/evaluations/" + evaluationId)).json();
  expect(evaluation.submissionId).toBe(submission.id);
  expect((await page.request.patch("/api/evaluations/" + evaluation.id, { data: { status: "COMPLETED", scores: saved.criteria.map((criterion: { id: string; maxPoints: number }) => ({ criterionId: criterion.id, points: criterion.maxPoints - 5 })) } })).status()).toBe(200);
  await page.goto("/cs/tasks/" + taskId); await page.getByRole("button", { name: "Upravit zadání", exact: true }).click();
  await expect(editor.getByLabel("Maximum bodů zadání", { exact: true })).toBeDisabled(); await expect(editor.getByLabel("Body kritéria 1", { exact: true })).toBeDisabled();
  expect((await page.request.patch("/api/tasks/" + taskId, { data: { maxPoints: 50 } })).status()).toBe(409);
  await editor.getByLabel("Pokyny k práci", { exact: true }).fill("Doplňující organizační pokyny."); await editor.getByRole("button", { name: "Uložit zadání", exact: true }).click(); await expect(editor).toBeHidden();
  const result = (await (await page.request.get("/api/evaluations/" + evaluation.id)).json()).evaluation; expect(result.totalPoints).toBe(90); expect(result.status).toBe("COMPLETED");
 } finally { await context.close(); await studentContext.close(); }
});


test("publishing an assignment without criteria creates the default full-point criterion", async ({ browser, baseURL }) => {
 const context = await browser.newContext({ baseURL, storageState: teacherStatePath });
 let taskId: string | undefined;
 try {
  const { subjects } = await (await context.request.get("/api/subjects")).json();
  const created = await context.request.post("/api/tasks", { data: { title: "E2E default criterion " + Date.now(), subjectId: subjects[0].id, maxPoints: 100 } });
  expect(created.status()).toBe(201);
  taskId = (await created.json()).task.id;
  const published = await context.request.patch("/api/tasks/" + taskId, { data: { status: "PUBLISHED" } });
  expect(published.status()).toBe(200);
  const { task } = await published.json();
  expect(task.status).toBe("PUBLISHED");
  expect(task.criteria).toHaveLength(1);
  expect(task.criteria[0]).toMatchObject({ name: "Celkové hodnocení", maxPoints: 100 });
 } finally {
  if (taskId) await context.request.delete("/api/tasks/" + taskId);
  await context.close();
 }
});
