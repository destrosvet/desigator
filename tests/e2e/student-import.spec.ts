import { teacherStatePath } from "./auth-setup";
import { expect, test, type Page } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
test.skip(process.env.E2E_WORKFLOW !== "true", "Requires isolated seeded database");
async function login(page: Page, email: string, password: string) {
  await page.goto("/cs/auth/login"); await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill(password); await page.getByRole("button", { name: /přihlásit/i }).click(); await expect(page).toHaveURL(/dashboard/);
}
function workbook() {
  const cell = (value: string, ref: string) => '<c r="' + ref + '" t="inlineStr"><is><t>' + value + '</t></is></c>';
  const sheet = (rows: string[][]) => strToU8('<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + rows.map((row, r) => '<row r="' + (r + 1) + '">' + row.map((value, c) => cell(value, String.fromCharCode(65 + c) + (r + 1))).join("") + '</row>').join("") + '</sheetData></worksheet>');
  return Buffer.from(zipSync({
    "[Content_Types].xml": strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    "_rels/.rels": strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    "xl/workbook.xml": strToU8('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Info" sheetId="1" r:id="rId1"/><sheet name="Studenti" sheetId="2" r:id="rId2"/></sheets></workbook>'),
    "xl/_rels/workbook.xml.rels": strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>'),
    "xl/worksheets/sheet1.xml": sheet([["Informace"]]),
    "xl/worksheets/sheet2.xml": sheet([["Jméno", "Mail", "ID"], ["Žaneta Černá", "zaneta@example.test", "00001234"]]),
  }));
}
test("teacher maps CSV columns, excludes errors and confirms class import without resetting existing accounts", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, storageState: teacherStatePath }); const studentContext = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage();
    const created = await page.request.post("/api/classes", { data: { name: "E2E import " + Date.now() } }); expect(created.status()).toBe(201); const cls = (await created.json()).class;
    const stamp = Date.now(); const email = "import" + stamp + "@example.test"; const externalId = "00" + stamp;
    const csv = '\uFEFFIdentifikátor;Příjmení;Jméno;Kontakt\r\n' + externalId + ';Černá;Žaneta;' + email + '\r\nS001;Původní;Student;student1@desigator.cz\r\nBAD;Chybný;Řádek;neplatny-email';
    const student = await studentContext.newPage(); await login(student, "student1@desigator.cz", "student123");
    expect((await student.request.post("/api/classes/" + cls.id + "/students/import", { data: { rows: [], confirmed: false } })).status()).toBe(403);
    await page.goto("/cs/classes/" + cls.id); await page.getByRole("button", { name: "Importovat studenty z CSV / Excelu", exact: true }).click();
    await page.getByLabel("CSV nebo Excel (.xlsx), do 5 MB", { exact: true }).setInputFiles({ name: "studenti.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.getByRole("button", { name: "Načíst soubor", exact: true }).click();
    await expect(page.getByLabel("List souboru", { exact: true })).toBeVisible();
    await page.getByLabel("Jméno", { exact: true }).selectOption("2"); await page.getByLabel("Příjmení", { exact: true }).selectOption("1");
    await page.getByLabel("E-mail", { exact: true }).selectOption("3"); await page.getByLabel("Školní ID", { exact: true }).selectOption("0");
    await page.getByRole("button", { name: "Zkontrolovat import", exact: true }).click();
    await expect(page.getByText("Chybí platný e-mail.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Importovat do třídy", exact: true })).toBeDisabled();
    expect((await (await page.request.get("/api/classes/" + cls.id)).json()).class.students).toHaveLength(0);
    await page.getByRole("checkbox", { name: "Zahrnout řádek 4", exact: true }).uncheck();
    await page.getByRole("button", { name: "Zkontrolovat import", exact: true }).click();
    await expect(page.getByRole("button", { name: "Importovat do třídy", exact: true })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath("mapped-import-preview.png"), fullPage: true });
    await page.getByRole("button", { name: "Importovat do třídy", exact: true }).click(); await page.getByRole("button", { name: "Zrušit", exact: true }).click();
    expect((await (await page.request.get("/api/classes/" + cls.id)).json()).class.students).toHaveLength(0);
    await page.getByRole("button", { name: "Importovat do třídy", exact: true }).click();
    const response = page.waitForResponse((res) => res.url().endsWith("/students/import") && res.request().postDataJSON()?.confirmed);
    await page.getByRole("button", { name: "Potvrdit import", exact: true }).click(); const result = await (await response).json();
    expect(result.created).toBe(1); expect(result.added).toBe(1); expect(result.credentials).toHaveLength(1);
    await expect(page.getByRole("status")).toContainText("Import dokončen");
    const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Stáhnout přístupy nových studentů", exact: true }).click(); expect((await download).suggestedFilename()).toBe("pristupy-studentu.csv");
    const roster = (await (await page.request.get("/api/classes/" + cls.id)).json()).class.students;
    expect(roster).toHaveLength(2); expect(roster.find((item: { student: { email: string } }) => item.student.email === email).student).toMatchObject({ name: "Žaneta Černá", externalId });
    const repeated = await page.request.post("/api/classes/" + cls.id + "/students/import", { data: { rows: [{ row: 2, name: "Žaneta Černá", email, externalId }], confirmed: false } }); expect((await repeated.json()).rows[0].action).toBe("skip");
    const newContext = await browser.newContext({ baseURL }); const newcomer = await newContext.newPage(); await login(newcomer, email, result.credentials[0].password); await newContext.close();
    // XLSX is a real two-sheet OOXML workbook, including a text ID with leading zeros.
    const xlsx = await page.request.post("/api/classes/" + cls.id + "/students/import-file", { multipart: { file: { name: "studenti.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: workbook() } } });
    expect(xlsx.status()).toBe(200); const sheets = (await xlsx.json()).sheets; expect(sheets.map((sheet: { name: string }) => sheet.name)).toEqual(["Info", "Studenti"]); expect(sheets[1].rows[1]).toEqual(["Žaneta Černá", "zaneta@example.test", "00001234"]);
  } finally { await context.close(); await studentContext.close(); }
});
