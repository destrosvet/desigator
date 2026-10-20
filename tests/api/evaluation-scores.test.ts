import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), canManage: vi.fn(), evaluation: vi.fn(), criteria: vi.fn(), transaction: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/authorization", () => ({ canManageEvaluation: mocks.canManage }));
vi.mock("@/lib/db", () => ({ db: { evaluation: { findUnique: mocks.evaluation }, evaluationCriterion: { findMany: mocks.criteria }, $transaction: mocks.transaction } }));
import { PATCH } from "@/app/api/evaluations/[id]/route";

function save(scores: Array<{ criterionId: string; points: number }>) {
  return PATCH(new Request("http://localhost/api/evaluations/review-1", { method: "PATCH", body: JSON.stringify({ status: "COMPLETED", scores }) }), { params: Promise.resolve({ id: "review-1" }) });
}

describe("completed evaluation validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ user: { id: "reviewer", role: "EVALUATOR" } });
    mocks.canManage.mockResolvedValue(true);
    mocks.evaluation.mockResolvedValue({ id: "review-1", submissionId: "work-1", submission: { taskId: "task-1", task: { maxPoints: 100 } } });
    mocks.criteria.mockResolvedValue([{ id: "composition", maxPoints: 60 }, { id: "craft", maxPoints: 60 }]);
  });

  it("rejects a duplicate criterion instead of counting its points twice", async () => {
    expect((await save([{ criterionId: "composition", points: 20 }, { criterionId: "composition", points: 20 }])).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires every criterion before completing a review", async () => {
    expect((await save([{ criterionId: "composition", points: 20 }])).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("enforces the task total even if individual scores are valid", async () => {
    expect((await save([{ criterionId: "composition", points: 60 }, { criterionId: "craft", points: 60 }])).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
