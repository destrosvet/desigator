import { expect, test } from "@playwright/test";
import { teacherStatePath } from "./auth-setup";
import { demoStatePath } from "./demo-auth";

test.skip(process.env.E2E_MEDIA !== "true", "Requires isolated demo data and private storage");

test("review navigation and return preserve the grid filter across saving and reload", async ({ browser, baseURL }) => {
 test.setTimeout(90000);
 const teacher = await browser.newContext({ baseURL, storageState: teacherStatePath });
 const reviewer = await browser.newContext({ baseURL, storageState: demoStatePath("evaluator") });
 let taskId: string | undefined;
 try {
  const { subjects } = await (await teacher.request.get("/api/subjects")).json();
  const title = "E2E filtered review " + Date.now();
  const created = await teacher.request.post("/api/tasks", { data: { title, subjectId: subjects[0].id, maxPoints: 10, criteria: [{ name: "Provedení", maxPoints: 10 }] } });
  expect(created.status()).toBe(201);
  const { task } = await created.json(); taskId = task.id;
  expect((await teacher.request.patch("/api/tasks/" + task.id, { data: { status: "PUBLISHED" } })).status()).toBe(200);
  const session = await (await reviewer.request.get("/api/auth/session")).json();
  const roster = await (await teacher.request.get("/api/submissions/bulk-upload?taskId=" + task.id)).json();
  const reviewIds: string[] = [];
  for (const externalId of ["S001", "S002", "S003"]) {
   const author = roster.students.find((student: { externalId: string }) => student.externalId === externalId);
   expect(author).toBeTruthy();
   const imported = await teacher.request.post("/api/submissions/bulk-upload", { multipart: { taskId: task.id, stage: "FINAL", confirmed: "true", studentIds: JSON.stringify([author.id]), files: { name: externalId + ".png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=", "base64") } } });
   expect(imported.status()).toBe(200);
   const { task: saved } = await (await teacher.request.get("/api/tasks/" + task.id)).json();
   const submission = saved.submissions.find((work: { studentId: string }) => work.studentId === author.id);
   const assigned = await teacher.request.post("/api/evaluations", { data: { submissionId: submission.id, evaluatorId: session.user.id } });
   expect(assigned.status()).toBe(201);
   reviewIds.push((await assigned.json()).evaluation.id);
  }
  expect((await reviewer.request.patch("/api/evaluations/" + reviewIds[1], { data: { status: "COMPLETED", scores: [{ criterionId: task.criteria[0].id, points: 5 }] } })).status()).toBe(200);
  const filters = new URLSearchParams({ taskId: task.id, status: "PENDING", search: title, evaluatorId: session.user.id, page: "1", limit: "1" });
  const result = await (await reviewer.request.get("/api/evaluations?" + filters)).json();
  expect(result.total).toBe(2);
  const firstId = result.evaluations[0].id;
  const page = await reviewer.newPage();
  await page.goto("/cs/evaluations?" + filters);
  await page.locator('a[href*="/evaluations/' + firstId + '?"]').click();
  await expect(page.getByLabel("Pořadí práce", { exact: true })).toHaveText("1 / 2");
  await page.reload();
  await expect(page.getByRole("button", { name: "Další student", exact: true })).toBeEnabled();
  await page.getByLabel("Provedení", { exact: true }).fill("7");
  await page.getByLabel("Provedení", { exact: true }).press("Control+Enter");
  await expect.poll(() => new URL(page.url()).pathname).not.toContain(firstId);
  await expect(page.getByRole("button", { name: "Předchozí student", exact: true })).toBeDisabled();
  expect(new URL(page.url()).searchParams.get("status")).toBe("PENDING");
  const nextId = new URL(page.url()).pathname.split("/").pop()!;
  expect(nextId).not.toBe(reviewIds[1]);
  expect((await (await reviewer.request.get("/api/evaluations/" + firstId)).json()).evaluation.status).toBe("COMPLETED");
  await page.reload();
  await expect(page.getByLabel("Pořadí práce", { exact: true })).toHaveText("1 / 1");
  await page.getByRole("button", { name: "Zpět na grid", exact: true }).click();
  await expect(page).toHaveURL(/\/cs\/evaluations\?/);
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual(Object.fromEntries(filters));
  await expect(page.getByLabel("Stav", { exact: true })).toHaveValue("PENDING");
  await expect(page.getByLabel("Zadání nebo zpětná vazba", { exact: true })).toHaveValue(title);
  await expect(page.locator('a[href*="/evaluations/' + firstId + '?"]')).toHaveCount(0);
  await expect(page.locator('a[href*="/evaluations/' + nextId + '?"]')).toHaveCount(1);
  await page.getByLabel("Stav", { exact: true }).selectOption("COMPLETED");
  await page.getByRole("button", { name: "Filtrovat", exact: true }).click();
  await page.locator('a[href*="/evaluations/' + firstId + '?"]').click();
  await expect(page.getByLabel("Pořadí práce", { exact: true })).toHaveText(/\/ 2$/);
  expect(new URL(page.url()).searchParams.get("status")).toBe("COMPLETED");
 } finally {
  if (taskId) await teacher.request.delete("/api/tasks/" + taskId);
  await Promise.all([teacher.close(), reviewer.close()]);
 }
});
