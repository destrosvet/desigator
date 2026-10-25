import { expect, test, type Page } from "@playwright/test";
import { teacherStatePath } from "./auth-setup";
test.skip(process.env.E2E_MEDIA !== "true", "Requires isolated demo database and storage");
test("review is the primary header action for teacher and reviewer; import belongs to student work", async ({ browser, baseURL }, testInfo) => {
 const teacherContext = await browser.newContext({ baseURL, storageState: teacherStatePath }); const reviewerContext = await browser.newContext({ baseURL });
 try {
  const teacher = await teacherContext.newPage(); const { subjects } = await (await teacher.request.get("/api/subjects")).json();
  const created = await teacher.request.post("/api/tasks", { data: { title: "E2E action hierarchy " + Date.now(), subjectId: subjects[0].id, maxPoints: 100, criteria: [{ name: "Provedení", maxPoints: 100 }] } }); expect(created.status()).toBe(201); const { task } = await created.json();
  expect((await teacher.request.patch("/api/tasks/" + task.id, { data: { status: "PUBLISHED" } })).ok()).toBeTruthy();
  const { students } = await (await teacher.request.get("/api/submissions/bulk-upload?taskId=" + task.id)).json(); const author = students.find((item: { externalId: string }) => item.externalId === "S001");
  const imported = await teacher.request.post("/api/submissions/bulk-upload", { multipart: { taskId: task.id, stage: "FINAL", confirmed: "true", studentIds: JSON.stringify([author.id]), files: { name: "S001.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=", "base64") } } }); expect(imported.status()).toBe(200);
  const reviewer = await reviewerContext.newPage(); await reviewer.goto("/cs/auth/login"); await reviewer.getByLabel("E-mail", { exact: true }).fill("evaluator@desigator.cz"); await reviewer.getByLabel("Heslo", { exact: true }).fill("evaluator123"); await reviewer.getByRole("button", { name: /Přihlásit/ }).click(); await expect(reviewer).toHaveURL(/dashboard/);
  const { user } = await (await reviewer.request.get("/api/auth/session")).json(); const { task: saved } = await (await teacher.request.get("/api/tasks/" + task.id)).json();
  expect((await teacher.request.post("/api/evaluations", { data: { submissionId: saved.submissions[0].id, evaluatorId: user.id } })).status()).toBe(201);
  async function headerAction(page: Page) {
   const review = page.getByRole("button", { name: "Hodnotit práce", exact: true }); await expect(review).toHaveCount(1); await expect(review).toBeEnabled();
   await expect(page.getByRole("group", { name: "Akce zadání", exact: true }).getByRole("button", { name: "Hodnotit práce", exact: true })).toBeVisible();
   const badge = page.locator('[data-slot="badge"][title="PUBLISHED"]'); await expect(badge).toBeVisible();
   expect(await badge.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(await review.evaluate((node) => getComputedStyle(node).backgroundColor));
  }
  await teacher.goto("/cs/tasks/" + task.id); await headerAction(teacher);
  const workSection = teacher.locator('[data-slot="card"]').filter({ has: teacher.getByText("Studenti a odevzdání", { exact: true }) });
  const upload = workSection.getByRole("button", { name: "Hromadně nahrát práce", exact: true }); await expect(upload).toBeVisible(); await expect(upload).not.toHaveClass(/primary-action/);
  await teacher.screenshot({ path: testInfo.outputPath("teacher-task-actions.png"), fullPage: true });
  await upload.click(); await expect(teacher).toHaveURL(new RegExp("bulk-upload\\?taskId=" + task.id));
  await reviewer.goto("/cs/tasks/" + task.id); await headerAction(reviewer); await expect(reviewer.getByRole("button", { name: "Hromadně nahrát práce", exact: true })).toHaveCount(0);
  await reviewer.setViewportSize({ width: 390, height: 844 }); await headerAction(reviewer); await reviewer.screenshot({ path: testInfo.outputPath("reviewer-task-mobile.png"), fullPage: true });
  await reviewer.getByRole("button", { name: "Hodnotit práce", exact: true }).click(); await expect(reviewer).toHaveURL(/evaluations\//);
 } finally { await teacherContext.close(); await reviewerContext.close(); }
});
