import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { evaluationQuerySchema, listEvaluations } from "@/lib/evaluations";

const assignmentSchema = z.object({
  submissionId: z.string().min(1),
  evaluatorId: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = evaluationQuerySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid evaluation filters" }, { status: 400 });
  try {
    return NextResponse.json(await listEvaluations(session.user, parsed.data));
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
  }
}
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { submissionId, evaluatorId } = assignmentSchema.parse(await req.json());
    const submission = await db.submission.findFirst({
      where: {
        id: submissionId,
        ...(session.user.role === "TEACHER" ? { task: { creatorId: session.user.id } } : {}),
      },
      select: { id: true },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const assignedEvaluatorId = evaluatorId || session.user.id;
    const evaluator = await db.user.findFirst({
      where: { id: assignedEvaluatorId, role: { in: ["ADMIN", "TEACHER", "EVALUATOR"] }, isActive: true },
      select: { id: true },
    });
    if (!evaluator) return NextResponse.json({ error: "Evaluator not found" }, { status: 400 });

    const evaluation = await db.evaluation.upsert({
      where: { submissionId_evaluatorId: { submissionId, evaluatorId: assignedEvaluatorId } },
      update: {},
      create: { submissionId, evaluatorId: assignedEvaluatorId },
    });
    return NextResponse.json({ evaluation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to assign evaluation" }, { status: 500 });
  }
}
