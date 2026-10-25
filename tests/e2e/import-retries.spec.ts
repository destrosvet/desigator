import { expect, test } from "@playwright/test";
test.skip(process.env.E2E_PASSWORDS !== "true", "Requires isolated password/import test environment");
test("concurrent and repeated batches create one version; changed content creates the next", async ({ page }) => {
 test.setTimeout(90000);
 await page.goto("/cs/auth/login"); await page.getByLabel("E-mail", { exact: true }).fill("teacher@desigator.cz"); await page.getByLabel("Heslo", { exact: true }).fill("teacher123"); await page.getByRole("button", { name: /Přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/);
 const { subjects } = await (await page.request.get("/api/subjects")).json();
 const created = await page.request.post("/api/tasks", { data: { title: "Retry E2E " + Date.now(), subjectId: subjects[0].id, maxPoints: 100, criteria: [{ name: "Provedení", maxPoints: 100 }] } }); expect(created.status()).toBe(201); const { task } = await created.json();
 const roster = await (await page.request.get("/api/submissions/bulk-upload?taskId=" + task.id)).json(); const studentId = roster.students[0].id;
 const bytes = Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=", "base64"));
 const result = await page.evaluate(async ({ taskId, studentId, bytes }) => {
   const send = async (reverse = false, changed = false) => { const data = new FormData(); data.set("taskId", taskId); data.set("studentIds", JSON.stringify([studentId, studentId])); data.set("confirmed", "true"); data.set("stage", "FINAL"); for (const name of reverse ? ["view2.png", "view1.png"] : ["view1.png", "view2.png"]) data.append("files", new File([new Uint8Array(changed ? [...bytes, 0] : bytes)], name, { type: "image/png" })); const response = await fetch("/api/submissions/bulk-upload", { method: "POST", body: data }); return { status: response.status, body: await response.json() }; };
   const concurrent = await Promise.all([send(), send()]); const repeated = await send(true); const changed = await send(false, true); return { concurrent, repeated, changed };
 }, { taskId: task.id, studentId, bytes });
 expect(result.concurrent.map(item => item.status)).toEqual([200, 200]); expect(result.concurrent.map(item => item.body.replayed).sort()).toEqual([false, true]); expect(result.repeated.body.replayed).toBe(true); expect(result.changed.body.replayed).toBe(false);
 const works = (await (await page.request.get("/api/tasks/" + task.id)).json()).task.submissions; expect(works).toHaveLength(2); expect(works.map((work: { version: number }) => work.version).sort()).toEqual([1, 2]); expect(works.every((work: { attachments: unknown[] }) => work.attachments.length === 2)).toBe(true);
 // The UI explains why importing an identical batch adds no extra version.
 await page.goto("/cs/tasks/bulk-upload?taskId=" + task.id); await expect(page.getByLabel("Stav nové verze")).toBeVisible();
 await page.locator("#import-files").setInputFiles([{ name: "view1.png", mimeType: "image/png", buffer: Buffer.from(bytes) }, { name: "view2.png", mimeType: "image/png", buffer: Buffer.from(bytes) }]);
 await page.getByLabel("Autor souboru 1").selectOption(studentId); await page.getByLabel("Autor souboru 2").selectOption(studentId); await page.getByLabel("Zkontroloval/a jsem autory všech vybraných souborů.").check(); await page.getByRole("button", { name: "Potvrdit párování a nahrát" }).click(); await expect(page.getByRole("status")).toContainText("Další verze nevznikly");
});
