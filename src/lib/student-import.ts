import { z } from "zod";
export const importRowsSchema = z.array(z.object({
  row: z.number().int().min(1),
  name: z.string().trim().max(200),
  email: z.string().trim().toLowerCase().max(254),
  externalId: z.string().trim().toUpperCase().max(100),
})).min(1).max(200).refine((rows) => new Set(rows.map((row) => row.row)).size === rows.length, "Čísla řádků musí být jedinečná.");
export type ImportStudent = z.infer<typeof importRowsSchema>[number];
export type ImportAccount = { id: string; name: string; email: string; externalId: string | null; role: string; organizationId?: string | null; isActive: boolean; classMemberships: { classId: string }[] };
export type ImportDecision = ImportStudent & { action: "create" | "add" | "skip" | "error"; studentId: string | null; fillExternalId: boolean; message: string };
export function planStudentImport(rows: ImportStudent[], accounts: ImportAccount[], classId: string, organizationId?: string): ImportDecision[] {
  const emails = new Map(accounts.map((item) => [item.email.toLowerCase(), item]));
  const ids = new Map(accounts.filter((item) => item.externalId && (!organizationId || item.organizationId === organizationId)).map((item) => [item.externalId!.toUpperCase(), item]));
  const counts = (values: string[]) => values.reduce((map, value) => { if (value) map.set(value, (map.get(value) || 0) + 1); return map; }, new Map<string, number>());
  const emailCounts = counts(rows.map((item) => item.email)); const idCounts = counts(rows.map((item) => item.externalId));
  return rows.map((row) => {
    const result: ImportDecision = { ...row, action: "error", studentId: null, fillExternalId: false, message: "" };
    if (!row.name) return { ...result, message: "Chybí jméno." };
    if (!z.email().safeParse(row.email).success) return { ...result, message: "Chybí platný e-mail." };
    if (row.externalId && !/^[A-Z0-9]+$/.test(row.externalId)) return { ...result, message: "Školní ID smí obsahovat pouze písmena a číslice." };
    if ((emailCounts.get(row.email) || 0) > 1 || (row.externalId && (idCounts.get(row.externalId) || 0) > 1)) return { ...result, message: "Duplicitní e-mail nebo školní ID v souboru." };
    const byEmail = emails.get(row.email); const byId = row.externalId ? ids.get(row.externalId) : undefined;
    if (byId && byId.id !== byEmail?.id) return { ...result, message: "Školní ID patří jinému účtu. Zkontrolujte e-mail a ID." };
    if (byEmail) {
      if (organizationId && byEmail.organizationId !== organizationId) return { ...result, message: "Účet nelze přiřadit do této školy. Student musí nejdříve přijmout pozvánku." };
      if (byEmail.role !== "STUDENT" || !byEmail.isActive) return { ...result, message: "E-mail nelze použít pro aktivního studenta." };
      if (row.externalId && byEmail.externalId && row.externalId !== byEmail.externalId.toUpperCase()) return { ...result, message: "E-mail a školní ID neodpovídají stejnému studentovi." };
      const fillExternalId = Boolean(row.externalId && !byEmail.externalId);
      const member = byEmail.classMemberships.some((membership) => membership.classId === classId);
      return { ...result, action: member && !fillExternalId ? "skip" : "add", studentId: byEmail.id, fillExternalId, message: member ? fillExternalId ? "Doplnit chybějící školní ID." : "Již ve třídě – beze změny." : fillExternalId ? "Přidat existujícího studenta a doplnit školní ID." : "Přidat existujícího studenta do třídy." };
    }
    return { ...result, action: "create", message: "Vytvořit studentský účet a přidat do třídy." };
  });
}
export function parseCsv(text: string, separator?: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  if (!separator) {
    const line = source.split(/\r?\n/)[0] || "";
    separator = [";", ",", "\t"].map((value) => ({ value, count: line.split(value).length })).sort((a, b) => b.count - a.count)[0].value;
  }
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') { if (quoted && source[i + 1] === '"') { cell += '"'; i++; } else if (quoted || !cell) quoted = !quoted; else throw new Error("Neplatné uvozovky v CSV."); }
    else if (char === separator && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
    if (rows.length > 1000 || row.length > 50 || cell.length > 20000) throw new Error("Soubor je příliš rozsáhlý.");
  }
  if (quoted) throw new Error("Neuzavřené uvozovky v CSV.");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
