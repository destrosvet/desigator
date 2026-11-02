import { expect, test } from "@playwright/test";
import { teacherStatePath } from "./auth-setup";

test.skip(process.env.E2E_WORKFLOW !== "true", "Requires isolated demo database");
test.use({ storageState: teacherStatePath });
test("one student table supports fixed class scope, batch moves and membership removal", async ({ page }) => {
  test.setTimeout(90000);
  const prefix = "Transfer " + Date.now();
  const groups: Array<{ id: string; name: string }> = [];
  for (const suffix of ["source", "target", "other"]) {
    const response = await page.request.post("/api/classes", { data: { name: prefix + " " + suffix } });
    expect(response.status()).toBe(201); groups.push((await response.json()).class);
  }
  const [source, target, other] = groups;
  const students: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < 2; i++) {
    const response = await page.request.post("/api/students", { data: { name: prefix + " student " + i, email: "transfer-" + Date.now() + "-" + i + "@example.test", password: "Transfer-test-123" } });
    expect(response.status()).toBe(201); students.push((await response.json()).student);
    for (const group of [source, other]) expect((await page.request.post("/api/classes/" + group.id + "/students", { data: { studentId: students[i].id } })).status()).toBe(201);
  }
  // Existing membership in the destination must not create a duplicate or fail the batch.
  expect((await page.request.post("/api/classes/" + target.id + "/students", { data: { studentId: students[0].id } })).status()).toBe(201);
  await page.goto("/cs/classes/" + source.id);
  await expect(page.getByRole("textbox", { name: "Vyhledat studenta...", exact: true })).toBeVisible();
  for (const student of students) await expect(page.getByRole("row", { name: "Otevřít: " + student.name, exact: true })).toBeVisible();
  // A fixed source offers the shared table controls without a changeable class filter.
  await page.getByLabel("Vybrat všechny řádky na stránce", { exact: true }).check();
  await page.getByRole("button", { name: "Přesunout do jiné skupiny", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Přesunout studenty do jiné skupiny" });
  await expect(dialog.getByText("Vybraní studenti (2)", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Zrušit", exact: true }).click();
  expect((await (await page.request.get("/api/students?classId=" + source.id)).json()).total).toBe(2);
  // The main student list uses the same selection and transfer dialog.
  await page.goto("/cs/students");
  await page.getByRole("textbox", { name: "Vyhledat studenta...", exact: true }).fill(prefix);
  await page.getByRole("button", { name: "Hledat", exact: true }).click();
  await expect(page.getByText("Zobrazeno 2 z 2", { exact: true })).toBeVisible();
  await page.getByLabel("Vybrat všechny řádky na stránce", { exact: true }).check();
  await page.getByRole("button", { name: "Přesunout do jiné skupiny", exact: true }).click();
  await dialog.getByLabel("Původní skupina", { exact: true }).click();
  await page.getByRole("option", { name: source.name, exact: true }).click();
  await dialog.getByLabel("Cílová skupina", { exact: true }).click();
  await page.getByRole("option", { name: new RegExp(target.name) }).click();
  await dialog.getByRole("button", { name: "Potvrdit přesun", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Přesunuto studentů: 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Vyhledat studenta...", exact: true })).toHaveValue(prefix);
  for (const group of [source, target, other]) {
    const data = await (await page.request.get("/api/students?classId=" + group.id)).json();
    expect(data.total).toBe(group.id === source.id ? 0 : 2);
  }
  await page.goto("/cs/classes/" + target.id);
  await page.getByLabel("Vybrat všechny řádky na stránce", { exact: true }).check();
  await page.getByRole("button", { name: "Odebrat ze třídy (2)", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Potvrdit odebrání ze třídy", exact: true }).click();
  await expect(page.getByText("Žádné výsledky", { exact: true })).toBeVisible();
  const remaining = await (await page.request.get("/api/students?classId=" + other.id)).json();
  expect(remaining.students.map((student: { id: string }) => student.id).sort()).toEqual(students.map(student => student.id).sort());
});
