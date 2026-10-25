import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import readExcelFile from "read-excel-file/node";
import { authOptions } from "@/lib/auth";
import { canManageClass } from "@/lib/authorization";
import { parseCsv } from "@/lib/student-import";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions); const { id } = await params;
  if (!session || !(await canManageClass(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const form = await req.formData(); const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Vyberte CSV nebo XLSX soubor do 5 MB." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer()); let sheets: { name: string; rows: string[][] }[];
    if (file.name.toLowerCase().endsWith(".csv")) {
      const encoding = form.get("encoding") === "windows-1250" ? "windows-1250" : "utf-8";
      const separator = form.get("separator"); const delimiters: Record<string, string> = { semicolon: ";", comma: ",", tab: "\t" };
      sheets = [{ name: "CSV", rows: parseCsv(new TextDecoder(encoding).decode(bytes), typeof separator === "string" ? delimiters[separator] : undefined) }];
    } else if (file.name.toLowerCase().endsWith(".xlsx")) {
      const data = await readExcelFile(bytes);
      sheets = data.map((sheet) => ({ name: sheet.sheet, rows: sheet.data.map((row) => row.map((cell) => cell == null ? "" : cell instanceof Date ? cell.toISOString() : String(cell))) }));
    } else return NextResponse.json({ error: "Podporovány jsou CSV a XLSX. Starší XLS uložte jako XLSX nebo CSV." }, { status: 415 });
    if (!sheets.length || sheets.length > 20 || sheets.some((sheet) => sheet.rows.length > 1000 || sheet.rows.some((row) => row.length > 50 || row.some((cell) => cell.length > 20000)))) return NextResponse.json({ error: "Nejvýše 20 listů, 1000 řádků a 50 sloupců na list." }, { status: 400 });
    return NextResponse.json({ sheets });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? "Soubor nelze načíst: " + error.message.slice(0, 250) : "Soubor nelze načíst." }, { status: 400 }); }
}
