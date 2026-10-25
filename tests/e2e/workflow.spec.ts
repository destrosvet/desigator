import { teacherStatePath } from "./auth-setup";
import { expect, test, type Page } from "@playwright/test";

// Run only against an isolated, demo-seeded database. Never use production accounts.
test.skip(process.env.E2E_WORKFLOW !== "true", "Requires an isolated database with npm run db:seed");

test.use({ storageState: teacherStatePath });

async function login(page: Page, email: string, password: string) {
  await page.goto("/cs/auth/login");
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/heslo/i).fill(password);
  await page.getByRole("button", { name: /přihlásit/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test("teacher can select a subject and create a task from the form", async ({ page }) => {
  await page.goto("/cs/tasks");
  await page.getByRole("button", { name: "Nové zadání", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const title = `E2E formulář ${Date.now()}`;
  await dialog.getByRole("textbox").first().fill(title);
  await expect(dialog.getByRole("button", { name: "Vytvořit", exact: true })).toBeDisabled();
  await dialog.getByRole("combobox", { name: "Předmět", exact: true }).click();
  await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Vytvořit", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("teacher creates a task, student submits, assigned evaluator grades; other submissions stay private", async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const teacherContext = await browser.newContext({ baseURL, storageState: teacherStatePath });
  const studentContext = await browser.newContext({ baseURL });
  const evaluatorContext = await browser.newContext({ baseURL });
  try {
    const teacher = await teacherContext.newPage();
    const student = await studentContext.newPage();
    const evaluator = await evaluatorContext.newPage();
    const subjectsResponse = await teacher.request.get("/api/subjects");
    expect(subjectsResponse.ok()).toBeTruthy();
    const { subjects } = await subjectsResponse.json();
    const title = `E2E workflow ${Date.now()}`;
    const created = await teacher.request.post("/api/tasks", { data: {
      title, subjectId: subjects[0].id, maxPoints: 100,
      criteria: [{ name: "Funkčnost", maxPoints: 100 }],
    } });
    expect(created.status()).toBe(201);
    const { task } = await created.json();
    await teacher.goto(`/cs/tasks/${task.id}`);
    await teacher.getByRole("button", { name: "Publikovat", exact: true }).click();
    await expect(teacher.getByText("Publikováno", { exact: true })).toBeVisible();

    await login(evaluator, "evaluator@desigator.cz", "evaluator123");
    const before = await evaluator.request.get(`/api/tasks?search=${encodeURIComponent(title)}`);
    expect((await before.json()).tasks).toHaveLength(0);
    expect((await evaluator.request.get(`/api/tasks/${task.id}`)).status()).toBe(403);

    await login(student, "student1@desigator.cz", "student123");
    await student.goto(`/cs/tasks/${task.id}`);
    await student.getByRole("button", { name: /Odevzdat práci|Otevřít moji práci/ }).click();
    await student.getByLabel("Stav nové verze").selectOption("FINAL");
    await student.getByLabel("Text práce").fill("Řešení z integračního testu");
    await student.getByRole("button", { name: "Odevzdat", exact: true }).click();
    await expect(student.getByRole("status")).toContainText("Práce byla odevzdána.");
    const detail = await (await teacher.request.get(`/api/tasks/${task.id}`)).json();
    const submissionId = detail.task.submissions[0].id;
    const users = await (await teacher.request.get("/api/users?role=EVALUATOR")).json();
    const evaluatorSession = await (await evaluator.request.get("/api/auth/session")).json();
    expect(users.users.some((user: { id: string }) => user.id === evaluatorSession.user.id)).toBe(true);
    const assignment = await teacher.request.post("/api/evaluations", { data: { submissionId, evaluatorId: evaluatorSession.user.id } });
    expect(assignment.status()).toBe(201);
    const { evaluation } = await assignment.json();

    // A second student submits to the same task, but is not assigned to this evaluator.
    const secondContext = await browser.newContext({ baseURL });
    try {
      const second = await secondContext.newPage();
      await login(second, "student2@desigator.cz", "student123");
      expect((await second.request.post("/api/submissions", { multipart: { taskId: task.id, content: "Soukromá práce jiného studenta" } })).status()).toBe(201);
    } finally { await secondContext.close(); }

    const scoped = await (await evaluator.request.get(`/api/tasks/${task.id}`)).json();
    expect(scoped.task.submissions).toHaveLength(1);
    expect(scoped.task.submissions[0].id).toBe(submissionId);
    await evaluator.goto(`/cs/tasks/${task.id}`);
    await expect(evaluator.getByText("student2@desigator.cz", { exact: true })).toHaveCount(0);
    await evaluator.goto(`/cs/evaluations/${evaluation.id}`);
    await evaluator.getByRole("spinbutton").fill("85");
    await evaluator.getByRole("button", { name: /dokončit/i }).click();
    await expect(evaluator.getByRole("status")).toContainText(/uložen/i);
    expect((await student.request.get(`/api/evaluations/${evaluation.id}`)).status()).toBe(404);
    expect((await teacher.request.patch(`/api/submissions/${submissionId}/publication`, { data: { published: true } })).status()).toBe(200);
    const result = await (await student.request.get(`/api/evaluations/${evaluation.id}`)).json();
    expect(result.evaluation.totalPoints).toBe(85);
    expect(result.evaluation.status).toBe("COMPLETED");
  } finally {
    await teacherContext.close();
    await studentContext.close();
    await evaluatorContext.close();
  }
});
