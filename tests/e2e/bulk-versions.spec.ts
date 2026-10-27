import { restoreDemoSession } from "./demo-auth";
import { expect, test, type Page } from "@playwright/test";
test.skip(process.env.E2E_MEDIA !== "true", "Requires isolated demo database and private S3");
async function login(page: Page, email: string, password: string) {
  if (await restoreDemoSession(page, email, password)) return;
 await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill(password); await page.getByRole("button", { name: /přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/);
}
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=", "base64");
test("teacher checks authors before import and preserves WIP and final versions", async ({ browser, baseURL }, testInfo) => {
 test.setTimeout(90000);
 const context = await browser.newContext({ baseURL }); const studentContext = await browser.newContext({ baseURL });
 try {
  const page = await context.newPage(); await login(page, "teacher@desigator.cz", "teacher123");
  const { subjects } = await (await page.request.get("/api/subjects")).json();
  const created = await page.request.post("/api/tasks", { data: { title: "E2E historie " + Date.now(), subjectId: subjects[0].id, maxPoints: 100, criteria: [{ name: "Provedení", maxPoints: 100 }] } }); expect(created.status()).toBe(201); const { task } = await created.json();
  await page.request.patch("/api/tasks/" + task.id, { data: { status: "PUBLISHED" } });
  const roster = await (await page.request.get("/api/submissions/bulk-upload?taskId=" + task.id)).json();
  const author = roster.students.find((student: { externalId: string }) => student.externalId === "S001"); expect(author).toBeTruthy();
  await page.goto("/cs/tasks/" + task.id); await page.getByRole("button", { name: "Hromadně nahrát práce" }).click();
  await expect(page.getByLabel("Stav nové verze")).toBeVisible();
  await page.getByLabel("Stav nové verze").selectOption("WIP");
  let uploads = 0; page.on("request", (request) => { if (request.method() === "POST" && request.url().includes("/api/submissions/bulk-upload")) uploads++; });
  await page.locator("#import-files").setInputFiles([{ name: "S001_01.png", mimeType: "image/png", buffer: png }, { name: "neznamy.png", mimeType: "image/png", buffer: png }]);
  // Demo IDs are alphanumeric; automatic filename matching targets numeric school IDs.
  await page.getByLabel("Autor souboru 1").selectOption(author.id);
  await expect(page.getByRole("button", { name: "Potvrdit párování a nahrát" })).toBeDisabled();
  await page.getByLabel("Autor souboru 2").selectOption(author.id);
  expect(uploads).toBe(0);
  expect((await (await page.request.get("/api/tasks/" + task.id)).json()).task.submissions).toHaveLength(0);
  await page.getByLabel("Zkontroloval/a jsem autory všech vybraných souborů.").check();
  await page.screenshot({ path: testInfo.outputPath("confirmed-import.png"), fullPage: true });
  await page.getByRole("button", { name: "Potvrdit párování a nahrát" }).click(); await expect(page.getByRole("status")).toContainText("Uloženo 2 souborů");
  const first = (await (await page.request.get("/api/tasks/" + task.id)).json()).task.submissions[0]; expect(first.stage).toBe("WIP"); expect(first.version).toBe(1); expect(first.attachments).toHaveLength(2);
  expect((await page.request.post("/api/evaluations", { data: { submissionId: first.id } })).status()).toBe(409);
  await page.getByLabel("Stav nové verze").selectOption("FINAL");
  await page.locator("#import-files").setInputFiles([{ name: "S001_02.png", mimeType: "image/png", buffer: png }]);
  await page.getByLabel("Autor souboru 1").selectOption(author.id);
  await page.getByLabel("Zkontroloval/a jsem autory všech vybraných souborů.").check(); await page.getByRole("button", { name: "Potvrdit párování a nahrát" }).click(); await expect(page.getByRole("status")).toContainText("Uloženo 1 souborů");
  const works = (await (await page.request.get("/api/tasks/" + task.id)).json()).task.submissions;
  expect(works).toHaveLength(2); const final = works.find((work: { stage: string }) => work.stage === "FINAL"); expect(final.version).toBe(2); expect(works.find((work: { id: string }) => work.id === first.id).attachments).toHaveLength(2);
  expect((await page.request.get("/api/uploads/" + first.attachments[0].id)).ok()).toBeTruthy();
  const assigned = await page.request.post("/api/evaluations", { data: { submissionId: final.id } }); expect(assigned.status()).toBe(201); const { evaluation } = await assigned.json();
  expect((await page.request.patch("/api/evaluations/" + evaluation.id, { data: { status: "COMPLETED", feedback: "Výsledek verze 2", scores: [{ criterionId: task.criteria[0].id, points: 80 }] } })).status()).toBe(200);
  await page.goto("/cs/tasks/" + task.id);
  await expect(page.getByText("Historie verzí práce", { exact: true })).toHaveCount(0);
  await expect.poll(() => page.getByText("Neodevzdáno", { exact: true }).count()).toBeGreaterThanOrEqual(2);
  const studentRow = page.getByRole("row", { name: "Otevřít: " + author.name, exact: true });
  await expect(studentRow).toHaveCount(1); await studentRow.click();
  await expect(page).toHaveURL(new RegExp("/students/" + author.id + "$"));
  await expect(page.getByLabel("Otevřít uloženou verzi").locator("option")).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath("teacher-student-work.png"), fullPage: true });
  const student = await studentContext.newPage(); await login(student, "student1@desigator.cz", "student123"); await student.goto("/cs/tasks/" + task.id); await student.getByRole("button", { name: /Odevzdat práci|Otevřít moji práci/ }).click();
  await expect(student.getByText("Historie verzí práce", { exact: true })).toBeVisible();
  const other = roster.students.find((item: { id: string }) => item.id !== author.id);
  await student.goto("/cs/tasks/" + task.id + "/students/" + other.id);
  await expect(student.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  await student.goto("/cs/tasks/" + task.id + "/students/" + author.id);
  await student.getByLabel("Otevřít uloženou verzi").selectOption(first.id); await expect(student.locator("[data-testid=work-preview] img")).toBeVisible();
  await student.getByLabel("Stav nové verze").selectOption("WIP");
  await student.getByLabel("Text práce").fill("Další rozpracovaná varianta");
  const videoBytes = await student.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
    const drawing = canvas.getContext("2d")!; const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const chunks: Blob[] = []; recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" })); });
    recorder.start();
    for (let frame = 0; frame < 8; frame++) { drawing.fillStyle = frame % 2 ? "red" : "blue"; drawing.fillRect(0, 0, 64, 64); await new Promise((resolve) => setTimeout(resolve, 100)); }
    recorder.stop(); const blob = await stopped; stream.getTracks().forEach((track) => track.stop());
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await student.getByLabel("Přílohy", { exact: true }).setInputFiles([{ name: "S001_progress.webm", mimeType: "video/webm", buffer: Buffer.from(videoBytes) }]);
  await student.getByRole("button", { name: "Odevzdat", exact: true }).click();
  await expect(student.getByText("Práce byla odevzdána.", { exact: true })).toBeVisible();
  const history = (await (await page.request.get("/api/tasks/" + task.id)).json()).task.submissions; expect(history).toHaveLength(3); expect(history.find((work: { version: number }) => work.version === 3).stage).toBe("WIP");
  const scored = (await (await page.request.get("/api/evaluations/" + evaluation.id)).json()).evaluation; expect(scored.submissionId).toBe(final.id); expect(scored.totalPoints).toBe(80); expect(scored.status).toBe("COMPLETED");
  const videoVersion = history.find((work: { version: number }) => work.version === 3);
  await student.getByLabel("Otevřít uloženou verzi").selectOption(videoVersion.id);
  const player = student.locator("video"); await expect(player).toBeVisible();
  await expect.poll(() => player.evaluate((node: HTMLVideoElement) => node.readyState)).toBeGreaterThan(0);
  await player.evaluate((node: HTMLVideoElement) => node.play());
  await expect.poll(() => player.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0);
  await student.setViewportSize({ width: 390, height: 844 }); await student.screenshot({ path: testInfo.outputPath("student-history-mobile.png"), fullPage: true });
 } finally { await context.close(); await studentContext.close(); }
});
