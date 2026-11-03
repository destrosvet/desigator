import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), manage: vi.fn(), users: vi.fn(), user: vi.fn(), assigned: vi.fn(), upsert: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/authorization", () => ({ canManageSubject: m.manage }));
vi.mock("@/lib/db", () => ({ db: { user: { findMany: m.users, findFirst: m.user }, subjectEvaluator: { findMany: m.assigned, upsert: m.upsert } } }));
import { GET, POST } from "@/app/api/subjects/[id]/evaluators/route";
const context = { params: Promise.resolve({ id: "subject" }) };
const request = (data: unknown = { evaluatorId: "external" }) => new Request("http://localhost/api/subjects/subject/evaluators", { method: "POST", body: JSON.stringify(data) });
describe("subject evaluator management", () => {
  beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "owner", role: "TEACHER" } }); m.manage.mockResolvedValue(true); m.user.mockResolvedValue({ id: "external", role: "TEACHER", roles: ["TEACHER", "EVALUATOR"], organizationId: "other-school" }); m.users.mockResolvedValue([]); m.assigned.mockResolvedValue([]); });
  it("requires authentication and subject management for listing and assigning", async () => {
    m.session.mockResolvedValueOnce(null); expect((await GET(request(), context)).status).toBe(401);
    m.manage.mockResolvedValue(false); expect((await GET(request(), context)).status).toBe(403); expect((await POST(request(), context)).status).toBe(403);
    expect(m.users).not.toHaveBeenCalled(); expect(m.upsert).not.toHaveBeenCalled();
  });
  it("assigns an external-school teacher with evaluator permission idempotently", async () => {
    expect((await POST(request(), context)).status).toBe(200);
    expect(m.upsert).toHaveBeenCalledWith({ where: { subjectId_evaluatorId: { subjectId: "subject", evaluatorId: "external" } }, update: {}, create: { subjectId: "subject", evaluatorId: "external" } });
  });
  it("rejects inactive, missing or ineligible accounts and invalid input", async () => {
    m.user.mockResolvedValueOnce(null); expect((await POST(request(), context)).status).toBe(400);
    m.user.mockResolvedValueOnce({ id: "student", role: "STUDENT" }); expect((await POST(request(), context)).status).toBe(400);
    expect((await POST(request({}), context)).status).toBe(400); expect(m.upsert).not.toHaveBeenCalled();
  });
  it("lists only public account fields for subject managers", async () => {
    m.assigned.mockResolvedValue([{ evaluator: { id: "external", name: "Teacher" } }]);
    const response = await GET(request(), context); expect(await response.json()).toEqual({ available: [], assigned: [{ id: "external", name: "Teacher" }] });
    expect(m.users.mock.calls[0][0].select).not.toHaveProperty("password");
  });
});
