import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), find: vi.fn(), scoped: vi.fn(), count: vi.fn(), update: vi.fn(), raw: vi.fn(), org: vi.fn(), subCount: vi.fn(), classCount: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { $transaction: async (fn: (tx: unknown) => unknown) => fn({ $queryRaw: m.raw, $executeRaw: m.raw, user: { findUnique: m.find, findFirst: m.scoped, count: m.count, update: m.update }, organization: { findUnique: m.org }, submission: { count: m.subCount }, classStudent: { count: m.classCount } }) } }));
import { PATCH } from "@/app/api/admin/users/[id]/route";
const actor = { id: "admin", role: "ADMIN", roles: ["ADMIN"], isActive: true };
const member = { id: "member", role: "TEACHER", roles: ["TEACHER"], isActive: true, organizationId: "school" };
const data = { name: "Test User", email: "test@example.cz", institution: "", externalId: "", roles: ["TEACHER", "EVALUATOR"], isActive: true, organizationId: "school" };
const patch = (body: unknown = data, id = "member") => PATCH(new Request("http://localhost/api/admin/users/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
describe("administrator user detail", () => {
  beforeEach(() => {
    vi.resetAllMocks(); m.session.mockResolvedValue({ user: actor });
    m.find.mockResolvedValueOnce(actor).mockResolvedValue(member); m.count.mockResolvedValue(0);
    m.org.mockResolvedValue({ id: "school" }); m.subCount.mockResolvedValue(0); m.classCount.mockResolvedValue(0);
  });
  it("saves profile and combined permissions without accepting password fields", async () => {
    expect((await patch()).status).toBe(200);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: "TEACHER", roles: ["TEACHER", "EVALUATOR"], institution: null }) }));
    expect((await patch({ ...data, password: "injected" })).status).toBe(400);
  });
  it("rejects evaluators", async () => {
    m.session.mockResolvedValue({ user: { ...member, role: "EVALUATOR", roles: ["EVALUATOR"] } });
    expect((await patch()).status).toBe(403); expect(m.update).not.toHaveBeenCalled();
  });
  it("allows teachers to edit only students in their managed scope", async () => {
    m.session.mockResolvedValue({ user: member });
    m.find.mockReset().mockResolvedValueOnce(member).mockResolvedValue({ ...member, id: "student", role: "STUDENT", roles: ["STUDENT"] });
    m.scoped.mockResolvedValue({ id: "student" });
    expect((await patch({ ...data, roles: ["STUDENT"] }, "student")).status).toBe(200);
    expect(m.scoped).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ role: "STUDENT", organizationId: "school" })]) }) }));
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: data.name, email: data.email, institution: null, externalId: null } }));
  });
  it("rejects teacher edits outside their scope", async () => {
    m.session.mockResolvedValue({ user: member }); m.find.mockReset().mockResolvedValue(member); m.scoped.mockResolvedValue(null);
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
    expect((await patch({ ...data, organizationId: null })).status).toBe(409);
  });
  it("attaches an unaffiliated account to a school the administrator picks", async () => {
    m.find.mockReset().mockResolvedValueOnce(actor).mockResolvedValue({ ...member, organizationId: null, roles: ["USER"] });
    m.org.mockResolvedValue({ id: "new-school" });
    expect((await patch({ ...data, roles: ["EVALUATOR"], organizationId: "new-school" })).status).toBe(200);
    expect(m.org).toHaveBeenCalledWith({ where: { id: "new-school" }, select: { id: true } });
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "new-school", roles: ["EVALUATOR"] }) }));
  });
  it("refuses to attach an account to a school that does not exist", async () => {
    m.find.mockReset().mockResolvedValueOnce(actor).mockResolvedValue({ ...member, organizationId: null, roles: ["USER"] });
    m.org.mockResolvedValue(null);
    expect((await patch({ ...data, roles: ["EVALUATOR"], organizationId: "ghost-school" })).status).toBe(404);
    expect(m.update).not.toHaveBeenCalled();
  });
  it("refuses to attach an account that already has student history elsewhere", async () => {
    m.find.mockReset().mockResolvedValueOnce(actor).mockResolvedValue({ ...member, organizationId: null, roles: ["USER"] });
    m.subCount.mockResolvedValue(1);
    expect((await patch({ ...data, roles: ["EVALUATOR"], organizationId: "school" })).status).toBe(409);
    expect(m.update).not.toHaveBeenCalled();
  });
  it("refuses to move an account directly between two schools", async () => {
    m.find.mockReset().mockResolvedValueOnce(actor).mockResolvedValue({ ...member, organizationId: "school-a" });
    expect((await patch({ ...data, organizationId: "school-b" })).status).toBe(409);
    expect(m.org).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled();
  });
  it("never lets a non-administrator change a managed student's organization", async () => {
    m.session.mockResolvedValue({ user: member });
    m.find.mockReset().mockResolvedValueOnce(member).mockResolvedValue({ ...member, id: "student", role: "STUDENT", roles: ["STUDENT"] });
    m.scoped.mockResolvedValue({ id: "student" });
    expect((await patch({ ...data, roles: ["STUDENT"], organizationId: "other-school" }, "student")).status).toBe(403);
    expect(m.update).not.toHaveBeenCalled();
  });
});
