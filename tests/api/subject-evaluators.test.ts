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
    const response = await GET(new Request("http://localhost/api/subjects/subject/evaluators?search=Teacher"), context); expect(await response.json()).toEqual({ available: [], hasMore: false, assigned: [{ id: "external", name: "Teacher" }] });
    expect(m.users.mock.calls[0][0].select).not.toHaveProperty("password");
  });
  it("does not fetch the full evaluator directory before a search", async () => {
    for (const search of ["", "a", "   "]) {
      const response = await GET(new Request("http://localhost/api/subjects/subject/evaluators?" + new URLSearchParams({ search })), context);
      expect((await response.json()).available).toEqual([]);
    }
    expect(m.users).not.toHaveBeenCalled();
  });
  it("searches name, email, institution and actual organization while excluding assigned users", async () => {
    await GET(new Request("http://localhost/api/subjects/subject/evaluators?search=%20School%20"), context);
    const args = m.users.mock.calls[0][0];
    const contains = { contains: "School", mode: "insensitive" };
    expect(args.where.AND[1]).toEqual({ evaluatedSubjects: { none: { subjectId: "subject" } } });
    expect(args.where.AND[2].OR).toEqual([{ name: contains }, { email: contains }, { institution: contains }, { organization: { name: contains } }]);
    expect(args.where.AND[0].isActive).toBe(true);
    expect(args.take).toBe(21); expect(args.select.organization).toEqual({ select: { name: true } });
  });
  it("limits results and signals when the user should refine their search", async () => {
    m.users.mockResolvedValue(Array.from({ length: 21 }, (_, id) => ({ id: String(id) })));
    const response = await GET(new Request("http://localhost/api/subjects/subject/evaluators?search=School"), context);
    const result = await response.json(); expect(result.available).toHaveLength(20); expect(result.hasMore).toBe(true);
  });
  it("rejects oversized searches", async () => {
    expect((await GET(new Request("http://localhost/api/subjects/subject/evaluators?search=" + "x".repeat(101)), context)).status).toBe(400);
    expect(m.users).not.toHaveBeenCalled();
  });
});
