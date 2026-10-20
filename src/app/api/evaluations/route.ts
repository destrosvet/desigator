import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = session.user.role === "ADMIN"
      ? {}
      : session.user.role === "TEACHER"
        ? { submission: { task: { creatorId: session.user.id } } }
        : session.user.role === "EVALUATOR"
          ? { evaluatorId: session.user.id }
          : { submission: { studentId: session.user.id } };
    if (taskId) {
      where.submission = { ...(where.submission || {}), taskId };
    }
    if (studentId) {
      where.submission = { ...(where.submission || {}), studentId };
    }
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { feedback: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [evaluations, total] = await Promise.all([
      db.evaluation.findMany({
        where,
        include: {
          evaluator: { select: { name: true } },
          submission: {
            include: {
              student: { select: { name: true } },
              task: { select: { title: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.evaluation.count({ where }),
    ]);

    return NextResponse.json({ evaluations, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
  }
}
