import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { criteriaInputSchema, rubricError } from "@/lib/task-validation";

const schema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(20000).nullable().optional(),
  instructions: z.string().max(20000).nullable().optional(),
  maxPoints: z.number().int().min(1).max(10000),
  criteria: criteriaInputSchema,
});
async function user() {
  const session = await getServerSession(authOptions);
  return session && ["TEACHER", "ADMIN"].includes(session.user.role) ? session.user : null;
}
export async function GET() {
  const owner = await user();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const templates = await db.assignmentTemplate.findMany({ where: { creatorId: owner.id }, orderBy: { title: "asc" } });
  return NextResponse.json({ templates });
}
async function save(req: Request, editing: boolean) {
  const owner = await user();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    const error = rubricError(parsed.criteria, parsed.maxPoints, true);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const data = { ...parsed, criteria: parsed.criteria.map(({ name, description, maxPoints }) => ({ name, description: description ?? null, maxPoints })) };
    if (editing) {
      const id = z.string().min(1).parse(body.id);
      const result = await db.assignmentTemplate.updateMany({ where: { id, creatorId: owner.id }, data });
      if (!result.count) return NextResponse.json({ error: "Šablona nebyla nalezena." }, { status: 404 });
      return NextResponse.json({ success: true });
    }
    const template = await db.assignmentTemplate.create({ data: { ...data, creatorId: owner.id } });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0].message : "Uložení šablony selhalo." }, { status: 400 });
  }
}
export async function POST(req: Request) { return save(req, false); }
export async function PATCH(req: Request) { return save(req, true); }
export async function DELETE(req: Request) {
  const owner = await user();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { ids, confirmed } = z.object({ ids: z.array(z.string().min(1)).min(1).max(100), confirmed: z.literal(true) }).parse(await req.json());
    const unique = [...new Set(ids)];
    const result = await db.$transaction(async (tx) => {
      const count = await tx.assignmentTemplate.count({ where: { id: { in: unique }, creatorId: owner.id } });
      if (count !== unique.length) return false;
      await tx.assignmentTemplate.deleteMany({ where: { id: { in: unique }, creatorId: owner.id } });
      return true;
    });
    if (!result || !confirmed) return NextResponse.json({ error: "Některé šablony nebyly nalezeny." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }
}
