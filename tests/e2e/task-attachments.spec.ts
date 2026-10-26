import { teacherStatePath } from "./auth-setup";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
test.skip(process.env.E2E_MEDIA !== "true", "Requires private test storage");
async function login(page: Page, email: string, password: string) {
  await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill(password); await page.getByRole("button", { name: /přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/);
}
test("teacher manages assignment reference files while students only read published attachments", async ({ browser, baseURL }) => {
 const context = await browser.newContext({ baseURL, storageState: teacherStatePath }); const studentContext = await browser.newContext({ baseURL });
 try {
  const page = await context.newPage();
  const subjects = (await (await page.request.get("/api/subjects?limit=999")).json()).subjects; const subject = subjects.find((item: { name: string }) => item.name === "Počítačová grafika") || subjects[0];
  const response = await page.request.post("/api/tasks", { data: { title: "E2E podklady " + Date.now(), subjectId: subject.id, criteria: [{ name: "Zpracování", maxPoints: 100 }] } }); const task = (await response.json()).task;
  await page.goto("/cs/tasks/" + task.id); const section = page.getByRole("region", { name: "Přílohy zadání", exact: true });
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#7654aa" } }).png().toBuffer();
  await section.getByLabel("Podklady a reference pro studenty", { exact: true }).setInputFiles([{ name: "reference.png", mimeType: "image/png", buffer: png }, { name: "pokyny.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 demo") }]);
  await section.getByRole("button", { name: "Nahrát přílohy", exact: true }).click(); await expect(section.getByText("Přílohy byly nahrány.", { exact: true })).toBeVisible();
  const files = (await (await page.request.get("/api/tasks/" + task.id + "/attachments")).json()).attachments; expect(files).toHaveLength(2);
  const student = await studentContext.newPage(); await login(student, "student1@desigator.cz", "student123");
  expect((await student.request.get("/api/uploads/" + files[0].id)).status()).toBe(403);
  expect((await student.request.delete("/api/tasks/" + task.id + "/attachments", { data: { ids: [files[0].id], confirmed: true } })).status()).toBe(403);
  expect((await page.request.patch("/api/tasks/" + task.id, { data: { status: "PUBLISHED" } })).status()).toBe(200);
  await student.goto("/cs/tasks/" + task.id); await expect(student.getByRole("link", { name: "reference.png", exact: true })).toBeVisible();
  expect((await student.request.get("/api/uploads/" + files[0].id)).status()).toBe(200);
  await section.getByRole("button", { name: "Smazat: reference.png", exact: true }).click(); await page.getByRole("button", { name: "Zrušit", exact: true }).click();
  expect((await (await page.request.get("/api/tasks/" + task.id + "/attachments")).json()).attachments).toHaveLength(2);
  expect((await page.request.delete("/api/tasks/" + task.id + "/attachments", { data: { ids: [files[0].id, "foreign"], confirmed: true } })).status()).toBe(404);
  expect((await (await page.request.get("/api/tasks/" + task.id + "/attachments")).json()).attachments).toHaveLength(2);
  await section.getByRole("checkbox", { name: "Vybrat všechny řádky na stránce", exact: true }).check(); await section.getByRole("button", { name: "Smazat vybrané (2)", exact: true }).click();
  await page.getByRole("button", { name: "Potvrdit smazání", exact: true }).click(); await expect(section.getByText("K zadání zatím nejsou přiloženy žádné podklady.", { exact: true })).toBeVisible();
  expect((await page.request.get("/api/uploads/" + files[0].id)).status()).toBe(404);
 } finally { await context.close(); await studentContext.close(); }
});
