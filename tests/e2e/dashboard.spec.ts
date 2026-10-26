import { expect, test } from "@playwright/test";
import { teacherStatePath } from "./auth-setup";
test.skip(process.env.E2E_WORKFLOW !== "true", "Requires isolated demo database");
test("dashboard shows scoped live assignments and role-appropriate counters in both languages", async ({ browser, baseURL }, testInfo) => {
 const teacherContext = await browser.newContext({ baseURL, storageState: teacherStatePath }); const studentContext = await browser.newContext({ baseURL });
 try {
  const teacher = await teacherContext.newPage(); const { subjects } = await (await teacher.request.get("/api/subjects")).json(); const suffix = Date.now();
  const create = async (title: string) => { const response = await teacher.request.post("/api/tasks", { data: { title, subjectId: subjects[0].id, maxPoints: 100, criteria: [{ name: "Provedení", maxPoints: 100 }] } }); expect(response.status()).toBe(201); return (await response.json()).task; };
  const draft = await create("Private dashboard draft " + suffix); const published = await create("Visible dashboard task " + suffix);
  expect((await teacher.request.patch("/api/tasks/" + published.id, { data: { status: "PUBLISHED" } })).ok()).toBeTruthy();
  await teacher.goto("/cs/dashboard"); await expect(teacher.getByText(draft.title, { exact: true })).toBeVisible(); await expect(teacher.getByText("Nedokončená hodnocení", { exact: true })).toBeVisible();
  await expect(teacher.getByText("Zde se zobrazí grafy a statistiky aktivit.", { exact: true })).toHaveCount(0);
  const student = await studentContext.newPage(); await student.goto("/cs/auth/login"); await student.getByLabel("E-mail", { exact: true }).fill("student1@desigator.cz"); await student.getByLabel("Heslo", { exact: true }).fill("student123"); await student.getByRole("button", { name: /Přihlásit/ }).click(); await expect(student).toHaveURL(/dashboard/);
  await expect(student.getByText(published.title, { exact: true })).toBeVisible(); await expect(student.getByText(draft.title, { exact: true })).toHaveCount(0);
  await expect(student.getByText("Odevzdané verze", { exact: true })).toBeVisible(); await expect(student.getByText("Zveřejněné výsledky", { exact: true })).toBeVisible();
  await expect(student.getByRole("link", { name: "Ohodnotit", exact: true })).toHaveCount(0);
  await student.getByText(published.title, { exact: true }).click(); await expect(student).toHaveURL(new RegExp("/tasks/" + published.id + "$"));
  await student.goto("/en/dashboard"); await expect(student.getByText("Submitted versions", { exact: true })).toBeVisible(); await expect(student.getByText("Recently updated assignments", { exact: true })).toBeVisible();
  await student.setViewportSize({ width: 390, height: 844 }); await student.screenshot({ path: testInfo.outputPath("dashboard-mobile.png"), fullPage: true });
 } finally { await teacherContext.close(); await studentContext.close(); }
});


test("reviewer opens own pending or unfinished reviews directly from recent submissions", async ({ browser, baseURL }, testInfo) => {
 const teacherContext = await browser.newContext({ baseURL, storageState: teacherStatePath }); const reviewerContext = await browser.newContext({ baseURL });
 try {
  const teacher = await teacherContext.newPage(); const reviewer = await reviewerContext.newPage();
  await reviewer.goto("/cs/auth/login"); await reviewer.getByLabel("E-mail", { exact: true }).fill("evaluator@desigator.cz"); await reviewer.getByLabel("Heslo", { exact: true }).fill("evaluator123"); await reviewer.getByRole("button", { name: /Přihlásit/ }).click(); await expect(reviewer).toHaveURL(/dashboard/);
  const { user } = await (await reviewer.request.get("/api/auth/session")).json(); const { subjects } = await (await teacher.request.get("/api/subjects")).json();
  const title = "Dashboard review shortcut " + Date.now();
  const created = await teacher.request.post("/api/tasks", { data: { title, subjectId: subjects[0].id, maxPoints: 100, criteria: [{ name: "Provedení", maxPoints: 100 }] } }); expect(created.status()).toBe(201); const { task } = await created.json();
  expect((await teacher.request.patch("/api/tasks/" + task.id, { data: { status: "PUBLISHED" } })).ok()).toBeTruthy();
  const { students } = await (await teacher.request.get("/api/submissions/bulk-upload?taskId=" + task.id)).json();
  const authors = ["S001", "S002", "S003"].map((externalId) => students.find((student: { externalId: string }) => student.externalId === externalId));
  for (const author of authors) {
   const response = await teacher.request.post("/api/submissions/bulk-upload", { multipart: { taskId: task.id, stage: "FINAL", confirmed: "true", studentIds: JSON.stringify([author.id]), files: { name: author.externalId + ".png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=", "base64") } } }); expect(response.status()).toBe(200);
  }
  const { task: detail } = await (await teacher.request.get("/api/tasks/" + task.id)).json(); const ids: string[] = [];
  for (let index = 0; index < authors.length; index++) {
   const work = detail.submissions.find((item: { studentId: string }) => item.studentId === authors[index].id);
   const assigned = await teacher.request.post("/api/evaluations", { data: { submissionId: work.id, evaluatorId: user.id } }); expect(assigned.status()).toBe(201); const { evaluation } = await assigned.json(); ids.push(evaluation.id);
   if (index) expect((await reviewer.request.patch("/api/evaluations/" + evaluation.id, { data: { status: index === 1 ? "IN_PROGRESS" : "COMPLETED", scores: [{ criterionId: task.criteria[0].id, points: 75 }] } })).status()).toBe(200);
   if (index === 2) expect((await teacher.request.post("/api/evaluations", { data: { submissionId: work.id } })).status()).toBe(201);
  }
  await reviewer.goto("/cs/dashboard");
  for (let index = 0; index < authors.length; index++) {
   const row = reviewer.locator("li").filter({ hasText: title }).filter({ hasText: authors[index].name });
   const shortcut = row.getByRole("link", { name: "Ohodnotit", exact: true });
   if (index < 2) await expect(shortcut).toHaveAttribute("href", "/cs/evaluations/" + ids[index]); else await expect(shortcut).toHaveCount(0);
  }
  await reviewer.setViewportSize({ width: 390, height: 844 }); await reviewer.screenshot({ path: testInfo.outputPath("reviewer-dashboard-shortcuts.png"), fullPage: true });
  await reviewer.locator("li").filter({ hasText: title }).filter({ hasText: authors[0].name }).getByRole("link", { name: "Ohodnotit", exact: true }).click();
  await expect(reviewer).toHaveURL(new RegExp("/evaluations/" + ids[0] + "$"));
  await reviewer.goto("/en/dashboard"); await expect(reviewer.locator("li").filter({ hasText: title }).filter({ hasText: authors[1].name }).getByRole("link", { name: "Review", exact: true })).toHaveAttribute("href", "/en/evaluations/" + ids[1]);
 } finally { await teacherContext.close(); await reviewerContext.close(); }
});
