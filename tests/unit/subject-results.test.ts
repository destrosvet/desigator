import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ manage: vi.fn(), subject: vi.fn(), members: vi.fn(), tasks: vi.fn(), adjustments: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { subject: { findFirst: m.subject }, classStudent: { findMany: m.members }, task: { findMany: m.tasks }, pointAdjustment: { findMany: m.adjustments } } }));
vi.mock("@/lib/authorization", () => ({ canManageSubject: m.manage, managedSubjectScope: () => ({}) }));
import { subjectResults } from "@/lib/subject-results";

describe("subject result review breakdown", () => {
  beforeEach(() => {
    vi.resetAllMocks(); m.manage.mockResolvedValue(true);
    m.subject.mockResolvedValue({ id: "subject", name: "Design", year: 2026, classes: [{ classId: "class", class: { name: "Class", organizationId: "school", organization: { gradingScale: null } } }] });
    m.members.mockResolvedValue([{ student: { id: "student", name: "Student", externalId: "1" } }]);
    m.adjustments.mockResolvedValue([]);
    m.tasks.mockResolvedValue([{ id: "task", title: "Poster", maxPoints: 100, resultsPublishedAt: new Date(), submissions: [{ studentId: "student", resultsPublishedAt: null, evaluations: [
      { status: "COMPLETED", totalPoints: 80, evaluator: { id: "a", name: "Anna" } },
      { status: "COMPLETED", totalPoints: 60, evaluator: { id: "b", name: "Boris" } },
      { status: "PENDING", totalPoints: null, evaluator: { id: "c", name: "Cyril" } },
    ] }] }]);
  });
  it("shows every evaluator to subject managers while keeping the average", async () => {
    const result = await subjectResults({ id: "teacher", role: "TEACHER" }, "subject");
    const cell = result!.rows[0].cells[0];
    expect(cell.points).toBe(70);
    expect(cell.reviews).toEqual([
      { evaluatorId: "a", name: "Anna", status: "COMPLETED", points: 80 },
      { evaluatorId: "b", name: "Boris", status: "COMPLETED", points: 60 },
      { evaluatorId: "c", name: "Cyril", status: "PENDING", points: null },
    ]);
  });
  it("does not select or expose reviewer identities to students", async () => {
    m.manage.mockResolvedValue(false);
    const result = await subjectResults({ id: "student", role: "STUDENT", organizationId: "school" }, "subject");
    expect(result!.rows[0].cells[0]).not.toHaveProperty("reviews");
    expect(m.tasks.mock.calls[0][0].select.submissions.select.evaluations.select).not.toHaveProperty("evaluator");
  });
  it("counts completed unpublished reviews in the teacher's provisional total only", async () => {
    const [task] = await m.tasks();
    m.tasks.mockResolvedValue([{ ...task, resultsPublishedAt: null }]);
    const result = await subjectResults({ id: "teacher", role: "TEACHER" }, "subject");
    expect(result!.rows[0]).toMatchObject({ base: 70, total: 70, publishedTotal: 0, provisional: true, cells: [{ points: 70, published: false }] });
  });
  it("does not grant the results overview to an external evaluator", async () => {
    m.manage.mockResolvedValue(false);
    expect(await subjectResults({ id: "reviewer", role: "EVALUATOR" }, "subject")).toBeNull();
    expect(m.subject).not.toHaveBeenCalled();
  });
});
