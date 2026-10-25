import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageTask } from "@/lib/authorization";
import { lockedPublicationDate } from "@/lib/result-publication";
import { resultPublicationBlock } from "@/lib/result-publication-policy";
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
 const session = await getServerSession(authOptions);
 if (!session) return reply({ error: "unauthorized" }, 401);
 const { id } = await params;
 const submission = await db.submission.findUnique({ where: { id }, select: { taskId: true } });
 if (!submission || !(await canManageTask(session.user, submission.taskId))) return reply({ error: "forbidden" }, 403);
 try {
  const input = z.object({ published: z.boolean() }).strict().parse(await req.json());
  const result = await db.$transaction(async (tx) => {
   await lockedPublicationDate(tx, id);
   const current = await tx.submission.findUnique({ where: { id }, select: { stage: true, resultsPublishedAt: true, resultsPublishedById: true, task: { select: { status: true, maxPoints: true } }, evaluations: { select: { status: true, totalPoints: true } } } });
   if (!current) return { error: "notFound" };
   if (input.published) {
    if (current.task.status === "DRAFT") return { error: "draftTask" };
    const error = resultPublicationBlock(current.stage, current.evaluations, current.task.maxPoints);
    if (error) return { error };
   }
   if (Boolean(current.resultsPublishedAt) === input.published) return { publication: { resultsPublishedAt: current.resultsPublishedAt, resultsPublishedById: current.resultsPublishedById } };
   const publication = await tx.submission.update({ where: { id }, data: { resultsPublishedAt: input.published ? new Date() : null, resultsPublishedById: input.published ? session.user.id : null }, select: { resultsPublishedAt: true, resultsPublishedById: true } });
   return { publication };
  });
  return "error" in result ? reply(result, 409) : reply(result);
 } catch (error) { return reply({ error: error instanceof z.ZodError || error instanceof SyntaxError ? "invalidInput" : "serverError" }, error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500); }
}
