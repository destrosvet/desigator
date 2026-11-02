import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), request: vi.fn(), list: vi.fn(), count: vi.fn(), upsert: vi.fn(), updateRequest: vi.fn(), updateUser: vi.fn(), works: vi.fn(), memberships: vi.fn(), raw: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => {
  const tx = { $queryRaw: m.raw, user: { findUnique: m.user, findUniqueOrThrow: m.user, update: m.updateUser }, accessRequest: { findUnique: m.request, findMany: m.list, count: m.count, upsert: m.upsert, update: m.updateRequest }, submission: { count: m.works }, classStudent: { count: m.memberships } };
  return { db: { ...tx, $transaction: (fn: (tx: unknown) => unknown) => fn(tx) } };
});
import { GET, POST, PATCH } from "@/app/api/access-requests/route";
import { canCreateOrganization } from "@/lib/permissions";
const user = { id: "user", role: "USER", roles: ["USER"], organizationId: null, isActive: true, emailVerifiedAt: new Date() };
const admin = { ...user, id: "admin", role: "ADMIN", roles: ["ADMIN"] };
const req = (data: object) => new Request("http://localhost/api/access-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
describe("administrator-approved access requests", () => {
  beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user }); m.user.mockResolvedValue(user); m.request.mockResolvedValue(null); m.works.mockResolvedValue(0); m.memberships.mockResolvedValue(0); });
  it("does not grant privileges merely by submitting a request", async () => {
    expect((await POST(req({ requestedRole: "SCHOOL_ADMIN", reason: "Chci založit školu designu." }))).status).toBe(201);
    expect(m.upsert).toHaveBeenCalled(); expect(m.updateUser).not.toHaveBeenCalled(); expect(canCreateOrganization(user)).toBe(false);
  });
  it("rejects pending duplicates and attempts to request platform administration", async () => {
    m.request.mockResolvedValue({ status: "PENDING" }); expect((await POST(req({ requestedRole: "TEACHER", reason: "Potřebuji vyučovat design." }))).status).toBe(409);
    expect((await POST(req({ requestedRole: "ADMIN", reason: "Escalate privileges." }))).status).toBe(400);
  });
  it("does not allow unverified users to request higher rights", async () => {
    m.user.mockResolvedValue({ ...user, emailVerifiedAt: null }); expect((await POST(req({ requestedRole: "TEACHER", reason: "Potřebuji vyučovat design." }))).status).toBe(403);
  });
  it("limits requests to one per day after a decision", async () => {
    m.request.mockResolvedValue({ status: "REJECTED", updatedAt: new Date() }); expect((await POST(req({ requestedRole: "TEACHER", reason: "Potřebuji vyučovat design." }))).status).toBe(429);
  });
  it("only allows platform administrators to review requests", async () => {
    expect((await PATCH(req({ id: "request", decision: "APPROVED" }))).status).toBe(403);
    expect((await GET(new Request("http://localhost/api/access-requests?scope=admin"))).status).toBe(403);
  });
  it("grants the approved school role without creating an organization or granting ADMIN", async () => {
    m.session.mockResolvedValue({ user: admin }); m.user.mockImplementation(async ({ where }) => where.id === "admin" ? admin : user);
    m.request.mockResolvedValue({ id: "request", userId: user.id, status: "PENDING", requestedRole: "SCHOOL_ADMIN" });
    expect((await PATCH(req({ id: "request", decision: "APPROVED" }))).status).toBe(200);
    expect(m.updateUser).toHaveBeenCalledWith({ where: { id: user.id }, data: { roles: ["SCHOOL_ADMIN", "TEACHER", "EVALUATOR"], role: "TEACHER" } });
    expect(canCreateOrganization({ ...user, roles: ["SCHOOL_ADMIN", "TEACHER", "EVALUATOR"], role: "TEACHER" })).toBe(true);
  });
  it("rejects replayed decisions and preserves student history", async () => {
    m.session.mockResolvedValue({ user: admin }); m.user.mockImplementation(async ({ where }) => where.id === "admin" ? admin : user);
    m.request.mockResolvedValue({ id: "request", userId: user.id, status: "APPROVED", requestedRole: "TEACHER" });
    expect((await PATCH(req({ id: "request", decision: "APPROVED" }))).status).toBe(409);
    m.request.mockResolvedValue({ id: "request", userId: user.id, status: "PENDING", requestedRole: "TEACHER" }); m.works.mockResolvedValue(1);
    expect((await PATCH(req({ id: "request", decision: "APPROVED" }))).status).toBe(409); expect(m.updateUser).not.toHaveBeenCalled();
  });
  it("does not change roles when rejecting a request", async () => {
    m.session.mockResolvedValue({ user: admin }); m.user.mockImplementation(async ({ where }) => where.id === "admin" ? admin : user);
    m.request.mockResolvedValue({ id: "request", userId: user.id, status: "PENDING", requestedRole: "TEACHER" });
    expect((await PATCH(req({ id: "request", decision: "REJECTED", reviewNote: "Doplňte školu." }))).status).toBe(200);
    expect(m.updateUser).not.toHaveBeenCalled(); expect(m.updateRequest).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REJECTED", reviewedById: "admin" }) }));
  });
});
