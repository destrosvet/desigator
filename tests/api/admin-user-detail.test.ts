import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), find: vi.fn(), count: vi.fn(), update: vi.fn(), raw: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { $transaction: async (fn: (tx: unknown) => unknown) => fn({ $queryRaw: m.raw, user: { findUnique: m.find, count: m.count, update: m.update } }) } }));
import { PATCH } from "@/app/api/admin/users/[id]/route";
const actor = { id: "admin", role: "ADMIN", roles: ["ADMIN"], isActive: true };
const member = { id: "member", role: "TEACHER", roles: ["TEACHER"], isActive: true, organizationId: "school" };
const data = { name: "Test User", email: "test@example.cz", institution: "", externalId: "", roles: ["TEACHER", "EVALUATOR"], isActive: true };
const patch = (body: unknown = data, id = "member") => PATCH(new Request("http://localhost/api/admin/users/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
describe("administrator user detail", () => {
  beforeEach(() => {
    vi.resetAllMocks(); m.session.mockResolvedValue({ user: actor });
    m.find.mockResolvedValueOnce(actor).mockResolvedValue(member); m.count.mockResolvedValue(0);
  });
  it("saves profile and combined permissions without accepting password fields", async () => {
    expect((await patch()).status).toBe(200);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: "TEACHER", roles: ["TEACHER", "EVALUATOR"], institution: null }) }));
    expect((await patch({ ...data, password: "injected" })).status).toBe(400);
  });
  it("rejects non-administrators", async () => {
    m.session.mockResolvedValue({ user: member });
    expect((await patch()).status).toBe(403); expect(m.update).not.toHaveBeenCalled();
  });
  it("returns 404 for missing accounts", async () => {
    m.find.mockReset().mockResolvedValueOnce(actor).mockResolvedValue(null);
    expect((await patch()).status).toBe(404);
  });
  it("protects the current administrator", async () => {
    m.find.mockReset().mockResolvedValue(actor);
    expect((await patch({ ...data, roles: ["ADMIN"], isActive: false }, "admin")).status).toBe(409);
  });
  it("protects the last school administrator from deactivation", async () => {
    m.find.mockReset().mockResolvedValueOnce(actor).mockResolvedValue({ ...member, roles: ["SCHOOL_ADMIN"] });
    expect((await patch({ ...data, isActive: false })).status).toBe(409);
    expect(m.update).not.toHaveBeenCalled();
  });
  it("invalidates sessions on deactivation", async () => {
    expect((await patch({ ...data, isActive: false })).status).toBe(200);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sessionVersion: { increment: 1 } }) }));
  });
  it("rejects school permissions for external users", async () => {
    m.find.mockReset().mockResolvedValueOnce(actor).mockResolvedValue({ ...member, organizationId: null });
    expect((await patch()).status).toBe(409);
  });
});
