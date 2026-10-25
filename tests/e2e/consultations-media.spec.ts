import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { teacherStatePath } from "./auth-setup";
import { glbFixture, pdfFixture } from "../helpers/media-fixtures";
test.skip(process.env.E2E_MEDIA !== "true", "Requires isolated demo database and private S3");
test.use({ actionTimeout: 10000, channel: "chromium" });
async function login(page: Page, email: string) {
 await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill("student123"); await page.getByRole("button", { name: /přihlásit/i }).click(); await page.waitForURL(/dashboard/);
}
test("student and teacher consult one WIP version with private PDF and animated GLB previews", async ({ browser, baseURL }, testInfo) => {
 test.setTimeout(180000);
 const teacherContext = await browser.newContext({ baseURL, storageState: teacherStatePath });
 const studentContext = await browser.newContext({ baseURL });
 const otherContext = await browser.newContext({ baseURL });
 try {
  const teacher = await teacherContext.newPage();
  const { subjects } = await (await teacher.request.get("/api/subjects")).json();
  const created = await teacher.request.post("/api/tasks", { data: { title: "E2E Konzultace " + Date.now(), subjectId: subjects[0].id, maxPoints: 100, criteria: [{ name: "Provedení", maxPoints: 100 }] } });
  expect(created.status()).toBe(201); const { task } = await created.json();
  expect((await teacher.request.patch("/api/tasks/" + task.id, { data: { status: "PUBLISHED" } })).ok()).toBeTruthy();
  const student = await studentContext.newPage(); await login(student, "student1@desigator.cz");
  const { students } = await (await teacher.request.get("/api/submissions/bulk-upload?taskId=" + task.id)).json();
  const author = students.find((item: { externalId: string }) => item.externalId === "S001");
  const href = "/cs/tasks/" + task.id + "/students/" + author.id;
  await student.goto(href);
  await student.getByLabel("Text práce").fill("První WIP pro konzultaci");
  await student.getByLabel("Přílohy", { exact: true }).setInputFiles([{ name: "navrh.pdf", mimeType: "application/pdf", buffer: pdfFixture() }, { name: "model.glb", mimeType: "application/octet-stream", buffer: glbFixture() }]);
  await student.getByRole("button", { name: "Odevzdat", exact: true }).click(); await expect(student.getByText("Práce byla odevzdána.", { exact: true })).toBeVisible();
  const { task: detail } = await (await teacher.request.get("/api/tasks/" + task.id)).json(); const wip = detail.submissions[0];
  await expect(student.getByTitle("PDF: navrh.pdf")).toBeVisible();
  const pdf = wip.attachments.find((item: { mimeType: string }) => item.mimeType === "application/pdf");
  const pdfResponse = await student.request.get("/api/uploads/" + pdf.id + "?preview=1"); expect(pdfResponse.status()).toBe(200); expect(pdfResponse.headers()["x-frame-options"]).toBe("SAMEORIGIN"); expect(pdfResponse.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  // Full Chromium includes its PDF renderer; headless-shell does not.
  await expect.poll(async () => {
    const { data, info } = await sharp(await student.getByTitle("PDF: navrh.pdf").screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let orange = 0; for (let offset = 0; offset < data.length; offset += info.channels) if (data[offset] > 240 && data[offset + 1] > 30 && data[offset + 1] < 130 && data[offset + 2] < 30) orange++;
    return orange;
  }, { timeout: 15000 }).toBeGreaterThan(1000);
  await student.screenshot({ path: testInfo.outputPath("pdf-rendered.png"), fullPage: true });
  await student.getByRole("button", { name: "Zobrazit model.glb", exact: true }).click();
  const model = student.locator("model-viewer"); await expect(model).toBeVisible();
  await expect.poll(() => model.evaluate((node) => (node as HTMLElement & { loaded: boolean }).loaded), { timeout: 60000 }).toBe(true);
  await expect(student.getByRole("combobox", { name: "Animace", exact: true })).toHaveValue("Move");
  await student.getByRole("button", { name: "Přehrát", exact: true }).click();
  await expect.poll(() => model.evaluate((node) => (node as HTMLElement & { currentTime: number }).currentTime)).toBeGreaterThan(0);
  await student.getByRole("button", { name: "Pozastavit", exact: true }).click();
  await student.getByLabel("Čas", { exact: true }).focus(); await student.getByLabel("Čas", { exact: true }).press("End"); await student.getByLabel("Čas", { exact: true }).press("ArrowLeft");
  await expect.poll(() => model.evaluate((node) => (node as HTMLElement & { currentTime: number }).currentTime)).toBeCloseTo(0.99, 2);
  await student.getByRole("button", { name: "Obnovit pohled", exact: true }).click();
  await student.getByLabel("Zpráva ke konzultaci").fill("Mám upravit kompozici?"); await student.getByRole("button", { name: "Odeslat zprávu", exact: true }).click();
  await expect(student.getByText("Zpráva byla odeslána.", { exact: true })).toBeVisible();
  await teacher.goto(href); await expect(teacher.getByText("Mám upravit kompozici?", { exact: true })).toBeVisible();
  await teacher.getByLabel("Zpráva ke konzultaci").fill("Zvětšete hlavní motiv. <script>alert(1)</script>"); await teacher.getByRole("button", { name: "Odeslat zprávu", exact: true }).click();
  await expect(teacher.getByText("Zvětšete hlavní motiv. <script>alert(1)</script>", { exact: true })).toBeVisible();
  await student.getByRole("button", { name: "Obnovit diskusi", exact: true }).click(); await expect(student.getByText("Zvětšete hlavní motiv. <script>alert(1)</script>", { exact: true })).toBeVisible();
  const other = await otherContext.newPage(); await login(other, "student2@desigator.cz");
  expect((await other.request.get("/api/submissions/" + wip.id + "/comments")).status()).toBe(404);
  expect((await other.request.post("/api/submissions/" + wip.id + "/comments", { data: { content: "foreign" } })).status()).toBe(404);
  expect((await other.request.get("/api/uploads/" + pdf.id + "?preview=1")).status()).toBe(403);
  await student.getByLabel("Text práce").fill("Nová finální verze"); await student.getByLabel("Stav nové verze").selectOption("FINAL"); await student.getByRole("button", { name: "Odevzdat", exact: true }).click();
  await expect(student.getByText("Hodnocení verze 2", { exact: true })).toBeVisible();
  await expect(student.getByLabel("Zpráva ke konzultaci")).toHaveCount(0);
  await student.getByLabel("Otevřít uloženou verzi").selectOption(wip.id); await expect(student.getByText("Mám upravit kompozici?", { exact: true })).toBeVisible();
  await student.setViewportSize({ width: 390, height: 844 }); await student.screenshot({ path: testInfo.outputPath("consultation-mobile.png"), fullPage: true });
  await teacher.screenshot({ path: testInfo.outputPath("consultation-teacher.png"), fullPage: true });
 } finally { await teacherContext.close(); await studentContext.close(); await otherContext.close(); }
});
