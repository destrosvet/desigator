import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const assignmentSchema = z.object({
  submissionId: z.string().min(1),
  evaluatorId: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    const where: any = session.user.role === "ADMIN"
      ? {}
      : session.user.role === "TEACHER"
        ? { submission: { task: { creatorId: session.user.id } } }
        : session.user.role === "EVALUATOR"
          ? { evaluatorId: session.user.id }
          : { submission: { studentId: session.user.id } };

    if (taskId) where.submission = { ...(where.submission || {}), taskId };
    if (studentId) where.submission = { ...(where.submission || {}), studentId };
    if (status) where.status = status;
    if (search) where.feedback = { contains: search, mode: "insensitive" };

    const [evaluations, total] = await Promise.all([
      db.evaluation.findMany({
        where,
        include: {
          evaluator: { select: { id: true, name: true } },
          submission: {
            include: {
              student: { select: { id: true, name: true } },
              task: { select: { id: true, title: true, maxPoints: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.evaluation.count({ where }),
    ]);

    return NextResponse.json({ evaluations, total, page, limit });
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