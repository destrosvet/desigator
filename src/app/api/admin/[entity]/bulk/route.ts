import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { AdminRecordError, deleteAdminRecords, setTaskStatuses } from "@/lib/admin-records";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100).refine((ids) => new Set(ids).size === ids.length), confirmed: z.literal(true), status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional() });
async function mutate(req: Request, params: Promise<{ entity: string }>, remove: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const entity = z.enum(["students", "subjects", "tasks"]).safeParse((await params).entity);
  if (!entity.success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const data = schema.parse(await req.json());
    if (!remove && (entity.data !== "tasks" || !data.status)) return NextResponse.json({ error: "Nepodporovaná hromadná úprava." }, { status: 400 });
    const result = remove ? await deleteAdminRecords(session.user, entity.data, data.ids) : await setTaskStatuses(session.user, data.ids, data.status!);
    return NextResponse.json({ count: result.count });
  } catch (error) {
    if (error instanceof AdminRecordError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "Neplatný nebo nepotvrzený výběr." }, { status: 400 });
    return NextResponse.json({ error: "Operace selhala. Žádné vybrané záznamy nebyly změněny." }, { status: 409 });
  }
}
export async function DELETE(req: Request, { params }: { params: Promise<{ entity: string }> }) { return mutate(req, params, true); }
export async function PATCH(req: Request, { params }: { params: Promise<{ entity: string }> }) { return mutate(req, params, false); }
