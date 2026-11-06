import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn(), reviewers: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { subject: { findFirst: m.find }, user: { findMany: m.reviewers } } }));
import { readSubjectDetail } from "@/lib/subject-detail";
import { visibleSubjectScope, visibleTaskScope } from "@/lib/authorization";
const owner = { id: "owner", role: "TEACHER", roles: ["TEACHER", "EVALUATOR"], organizationId: "home" };
const subject = { id: "subject", teacherId: "owner", classes: [{ classId: "class", class: { id: "class", name: "Class", organizationId: "home" } }], tasks: [{ id: "task", creatorId: "owner" }], evaluators: [{ evaluator: { id: "external", name: "External", email: "external@test.example", organization: { name: "Other school" } } }] };
describe("subject detail data", () => {
  beforeEach(() => { vi.resetAllMocks(); m.find.mockResolvedValue(subject); m.reviewers.mockResolvedValue([]); });
  it("loads scoped subject detail and includes standalone reviewers for managers", async () => {
    const admin = { id: "admin", name: "Desigator" };
    m.reviewers.mockResolvedValue([admin]);
    const result = await readSubjectDetail(owner, "subject");
    expect(m.find).toHaveBeenCalledTimes(1);
    const args = m.find.mock.calls[0][0];
    expect(args.where).toEqual({ id: "subject", ...visibleSubjectScope(owner) });
    expect(args.select.tasks.where).toEqual(visibleTaskScope(owner));
    expect(args.select.tasks.select).not.toHaveProperty("description");
    expect(args.select.tasks.select).not.toHaveProperty("instructions");
    expect(result?.assignedEvaluators).toEqual([...subject.evaluators.map(link => link.evaluator), { ...admin, standalone: true }]);
    expect(result?.canManage).toBe(true); expect(result?.tasks[0].canManage).toBe(true);
  });
  it("hides evaluator identities and management for students and external reviewers", async () => {
    for (const user of [{ id: "student", role: "STUDENT", organizationId: "home" }, { ...owner, id: "external", organizationId: "other" }]) {
      const result = await readSubjectDetail(user, "subject");
      expect(result?.canManage).toBe(false); expect(result?.tasks[0].canManage).toBe(false); expect(result?.assignedEvaluators).toEqual([]);
    }
    expect(m.reviewers).not.toHaveBeenCalled();
  });
  it("does not fetch evaluator identities for a pure evaluator", async () => {
    await readSubjectDetail({ id: "external", role: "EVALUATOR" }, "subject");
    expect(m.find.mock.calls[0][0].select.evaluators.where).toEqual({ evaluatorId: { in: [] } });
  });
  it("returns no detail if the authorized query finds nothing", async () => {
    m.find.mockResolvedValue(null); expect(await readSubjectDetail(owner, "other-subject")).toBeNull();
  });
  it("respects explicit revoked roles even if a legacy teacherId matches", async () => {
    const result = await readSubjectDetail({ ...owner, roles: ["EVALUATOR"] }, "subject");
    expect(result?.canManage).toBe(false); expect(result?.assignedEvaluators).toEqual([]);
  });
});
