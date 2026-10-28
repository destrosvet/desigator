import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canManageTask } from "@/lib/authorization";
import { db } from "@/lib/db";
import { readTaskPublication } from "@/lib/task-result-publication";
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
 const session = await getServerSession(authOptions);
 if (!session) return reply({ error: "unauthorized" }, 401);
 const { id } = await params;
 if (!(await canManageTask(session.user, id))) return reply({ error: "forbidden" }, 403);
 const summary = await readTaskPublication(id);
 return summary ? reply({ summary }) : reply({ error: "notFound" }, 404);
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const session = await getServerSession(authOptions);
 if (!session) return reply({ error: "unauthorized" }, 401);
 const { id } = await params;
 if (!(await canManageTask(session.user, id))) return reply({ error: "forbidden" }, 403);
 try {
  const { published } = z.object({ published: z.boolean() }).strict().parse(await request.json());
  const result = await db.$transaction(async tx => {
   await tx.$queryRaw`SELECT id FROM tasks WHERE id = ${id} FOR UPDATE`;
   const task = await tx.task.findUnique({ where: { id }, select: { status: true, resultsPublishedAt: true } });
   if (!task) return { error: "notFound" as const };
   if (published && task.status === "DRAFT") return { error: "draftTask" as const };
   if (published !== Boolean(task.resultsPublishedAt)) await tx.task.update({ where: { id }, data: { resultsPublishedAt: published ? new Date() : null, resultsPublishedById: published ? session.user.id : null } });
   // Turning off the whole task also removes earlier per-version publication, so no old grade reappears.
   if (!published) await tx.submission.updateMany({ where: { taskId: id, resultsPublishedAt: { not: null } }, data: { resultsPublishedAt: null, resultsPublishedById: null } });
   return { summary: (await readTaskPublication(id, tx))! };
  });
  return "error" in result ? reply(result, result.error === "notFound" ? 404 : 409) : reply(result);
 } catch (error) {
  return reply({ error: error instanceof z.ZodError || error instanceof SyntaxError ? "invalidInput" : "serverError" }, error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500);
 }
}
