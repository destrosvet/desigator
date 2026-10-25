import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { canManageClass } from "@/lib/authorization";
import { db } from "@/lib/db";
import { importRowsSchema, planStudentImport, type ImportStudent } from "@/lib/student-import";

async function plan(client: Pick<Prisma.TransactionClient, "user">, rows: ImportStudent[], classId: string, organizationId: string) {
  const accounts = await client.user.findMany({ where: { OR: [{ email: { in: rows.map((row) => row.email), mode: "insensitive" } }, { organizationId, externalId: { in: rows.filter((row) => row.externalId).map((row) => row.externalId), mode: "insensitive" } }] }, select: { id: true, name: true, email: true, externalId: true, role: true, organizationId: true, isActive: true, classMemberships: { select: { classId: true } } } });
  return planStudentImport(rows, accounts, classId, organizationId);
}
const signature = (rows: ReturnType<typeof planStudentImport>) => createHash("sha256").update(JSON.stringify(rows.map((row) => [row.row, row.name, row.email, row.externalId, row.action, row.studentId, row.fillExternalId]))).digest("hex");
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions); const { id } = await params;
  if (!session || !(await canManageClass(session.user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = z.object({ rows: importRowsSchema, confirmed: z.boolean().default(false), expected: z.string().max(64).optional() }).parse(await req.json());
    const targetClass = await db.class.findUniqueOrThrow({ where: { id }, select: { organizationId: true } });
    const preview = await plan(db, body.rows, id, targetClass.organizationId);
    if (!body.confirmed) return NextResponse.json({ rows: preview, expected: signature(preview) });
    if (preview.some((row) => row.action === "error")) return NextResponse.json({ error: "Nejdříve opravte nebo vynechte chybné řádky.", rows: preview }, { status: 400 });
    if (body.expected !== signature(preview)) return NextResponse.json({ error: "Data se změnila. Znovu zkontrolujte náhled importu." }, { status: 409 });
    const credentials = new Map<number, { email: string; password: string; hash: string }>();
    // Password work happens before the short database transaction.
    for (const row of preview.filter((row) => row.action === "create")) {
      const password = randomBytes(15).toString("base64url");
      credentials.set(row.row, { email: row.email, password, hash: await bcrypt.hash(password, 12) });
    }
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM classes WHERE id = ${id} FOR UPDATE`;
      const current = await plan(tx, body.rows, id, targetClass.organizationId);
      if (signature(current) !== signature(preview)) return null;
      let created = 0; let added = 0; let skipped = 0; let filled = 0;
      for (const row of current) {
        if (row.action === "skip") { skipped++; continue; }
        let studentId = row.studentId;
        if (row.action === "create") {
          const student = await tx.user.create({ data: { name: row.name, email: row.email, externalId: row.externalId || null, password: credentials.get(row.row)!.hash, role: "STUDENT", roles: ["STUDENT"], organizationId: targetClass.organizationId }, select: { id: true } });
          studentId = student.id; created++;
        } else {
          if (row.fillExternalId) { const changed = await tx.user.updateMany({ where: { id: studentId!, externalId: null }, data: { externalId: row.externalId } }); if (changed.count !== 1) throw new Error("Student changed during import"); filled++; }
          added++;
        }
        await tx.classStudent.upsert({ where: { classId_studentId: { classId: id, studentId: studentId! } }, update: {}, create: { classId: id, studentId: studentId! } });
      }
      return { created, added, skipped, filled };
    }, { timeout: 30000 });
    if (!result) return NextResponse.json({ error: "Data se změnila. Znovu načtěte náhled importu." }, { status: 409 });
    return NextResponse.json({ ...result, credentials: [...credentials.values()].map(({ email, password }) => ({ email, password })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0].message : "Import nebyl dokončen. Zkontrolujte data a zkuste náhled znovu." }, { status: error instanceof z.ZodError ? 400 : 409 });
  }
}
