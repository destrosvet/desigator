import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ assignments: vi.fn(), transaction: vi.fn(), tasks: vi.fn(), task: vi.fn(), versions: vi.fn(), create: vi.fn(), lock: vi.fn(), published: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { subjectEvaluator: { findMany: m.assignments }, $transaction: m.transaction } }));
vi.mock("@/lib/result-publication", () => ({ lockedPublicationDate: m.published }));
import { syncSubjectEvaluations } from "@/lib/subject-evaluators";
const user = { id: "external", role: "EVALUATOR", roles: ["EVALUATOR"], organizationId: "other-school" };
describe("subject review assignments", () => {
  beforeEach(() => {
    vi.resetAllMocks(); m.assignments.mockResolvedValue([{ subjectId: "subject" }]); m.tasks.mockResolvedValue([{ id: "task" }]);
    m.task.mockResolvedValue({ maxPoints: 100, criteria: [{ maxPoints: 100 }], resultsPublishedAt: null });
    m.versions.mockResolvedValue([]); m.published.mockResolvedValue(null);
    m.transaction.mockImplementation(async run => run({ $queryRaw: m.lock, task: { findMany: m.tasks, findFirst: m.task }, submission: { findMany: m.versions }, evaluation: { createMany: m.create } }));
  });
  it("does not grant assignments to students or teachers whose evaluator role was revoked", async () => {
    await syncSubjectEvaluations({ ...user, role: "TEACHER", roles: ["TEACHER"] }); await syncSubjectEvaluations({ id: "student", role: "STUDENT" });
    expect(m.assignments).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("only scans subjects explicitly assigned to this evaluator, across schools", async () => {
    await syncSubjectEvaluations(user);
    expect(m.assignments.mock.calls[0][0].where.evaluatorId).toBe("external");
    const where = { status: { in: ["PUBLISHED", "CLOSED"] }, OR: [{ subjectId: { in: ["subject"] }, subject: { isActive: true, evaluators: { some: { evaluatorId: "external" } } } }] };
    expect(m.tasks.mock.calls[0][0].where).toEqual(where);
    expect(m.task.mock.calls[0][0].where).toEqual({ ...where, id: "task" });
  });
  it("prepares reviews for a teacher's own published tasks without a subject assignment", async () => {
    m.assignments.mockResolvedValue([]);
    m.versions.mockResolvedValue([{ id: "final", studentId: "student", stage: "FINAL" }]);
    await syncSubjectEvaluations({ id: "teacher", role: "TEACHER", roles: ["TEACHER", "EVALUATOR"], organizationId: "school" });
    const where = { status: { in: ["PUBLISHED", "CLOSED"] }, OR: [{ creatorId: "teacher", subject: { classes: { some: { class: { organizationId: "school" } } } }, submissions: { some: { stage: "FINAL" } } }] };
    expect(m.tasks.mock.calls[0][0].where).toEqual(where);
    expect(m.task.mock.calls[0][0].where).toEqual({ ...where, id: "task" });
    expect(m.create).toHaveBeenCalledWith({ data: [{ submissionId: "final", evaluatorId: "teacher" }], skipDuplicates: true });
  });
  it("includes new final versions but excludes WIP, older finals and individually published results", async () => {
    m.versions.mockResolvedValue([{ id: "a2", studentId: "a", stage: "WIP" }, { id: "a1", studentId: "a", stage: "FINAL" }, { id: "b2", studentId: "b", stage: "FINAL" }, { id: "b1", studentId: "b", stage: "FINAL" }, { id: "c1", studentId: "c", stage: "FINAL", resultsPublishedAt: new Date() }]);
    await syncSubjectEvaluations(user);
    expect(m.create).toHaveBeenCalledWith({ data: [{ submissionId: "b2", evaluatorId: "external" }], skipDuplicates: true });
  });
  it("refreshes future submissions idempotently without overwriting scores", async () => {
    m.versions.mockResolvedValue([{ id: "new", studentId: "a", stage: "FINAL" }]);
    await syncSubjectEvaluations(user); await syncSubjectEvaluations(user);
    expect(m.create).toHaveBeenCalledTimes(2); expect(m.create.mock.calls.every(([args]) => args.skipDuplicates && !("update" in args))).toBe(true);
  });
  it("allows live task results but respects publication locks and invalid rubrics", async () => {
    m.task.mockResolvedValue({ maxPoints: 100, criteria: [{ maxPoints: 100 }], resultsPublishedAt: new Date() });
    m.versions.mockResolvedValue([{ id: "live", studentId: "a", stage: "FINAL", resultsPublishedAt: new Date() }]);
    await syncSubjectEvaluations(user); expect(m.create).toHaveBeenCalledTimes(1);
    m.create.mockClear(); m.published.mockResolvedValue(new Date()); await syncSubjectEvaluations(user); expect(m.create).not.toHaveBeenCalled();
    m.task.mockResolvedValue({ maxPoints: 100, criteria: [] }); await syncSubjectEvaluations(user); expect(m.create).not.toHaveBeenCalled();
  });
  it("does nothing without membership or if membership disappears before the locked query", async () => {
    m.assignments.mockResolvedValueOnce([]); await syncSubjectEvaluations(user); expect(m.transaction).not.toHaveBeenCalled();
    m.task.mockResolvedValue(null); await syncSubjectEvaluations(user); expect(m.create).not.toHaveBeenCalled();
  });
});
