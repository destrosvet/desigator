import { describe, expect, it } from "vitest";
import { parseCsv, importRowsSchema, planStudentImport, type ImportAccount } from "@/lib/student-import";
const student: ImportAccount = { id: "s", name: "Původní jméno", email: "student@example.test", externalId: "001234", role: "STUDENT", isActive: true, classMemberships: [] };
const row = { row: 2, name: "Nové jméno", email: student.email, externalId: student.externalId! };
describe("CSV and mapped student import", () => {
  it("handles Czech semicolon CSV, BOM, quoted delimiters, escaped quotes and multiline cells", () => {
    expect(parseCsv('\uFEFFJméno;E-mail\r\n"Žák; ""Anna""";"a@example.test"\r\n"Více\nřádků";b@example.test')).toEqual([["Jméno", "E-mail"], ['Žák; "Anna"', "a@example.test"], ["Více\nřádků", "b@example.test"]]);
    expect(() => parseCsv('"neuzavřeno')).toThrow();
  });
  it("supports comma and tab separators and retains leading zeros", () => {
    expect(parseCsv("id,email\n0012,a@example.test")[1][0]).toBe("0012");
    expect(parseCsv("id\temail\n0012\ta@example.test")[1][0]).toBe("0012");
  });
  it("normalizes mapped values and rejects duplicate source row numbers", () => {
    expect(importRowsSchema.parse([{ ...row, email: "  Student@EXAMPLE.test ", externalId: " ab12 " }])[0]).toMatchObject({ email: "student@example.test", externalId: "AB12" });
    expect(importRowsSchema.safeParse([row, row]).success).toBe(false);
  });
  it("adds existing students without changing their account or skips existing members", () => {
    expect(planStudentImport([row], [student], "c")[0]).toMatchObject({ action: "add", studentId: "s" });
    expect(planStudentImport([row], [{ ...student, classMemberships: [{ classId: "c" }] }], "c")[0].action).toBe("skip");
  });
  it("only fills absent IDs and rejects conflicting IDs, inactive accounts and privileged accounts", () => {
    expect(planStudentImport([row], [{ ...student, externalId: null }], "c")[0]).toMatchObject({ action: "add", fillExternalId: true });
    for (const account of [{ ...student, externalId: "OTHER" }, { ...student, isActive: false }, { ...student, role: "TEACHER" }]) expect(planStudentImport([row], [account], "c")[0].action).toBe("error");
    expect(planStudentImport([{ ...row, email: "other@example.test" }], [student], "c")[0].action).toBe("error");
  });
  it("rejects all duplicate emails and IDs before creating any account", () => {
    expect(planStudentImport([row, { ...row, row: 3 }], [], "c").every((item) => item.action === "error")).toBe(true);
    expect(planStudentImport([{ ...row, externalId: "bad-id" }], [], "c")[0].action).toBe("error");
    expect(planStudentImport([row], [], "c")[0].action).toBe("create");
  });
});
