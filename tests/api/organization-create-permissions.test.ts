import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), raw: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { $transaction: (fn: (tx: unknown) => unknown) => fn({ $queryRaw: m.raw, user: { findUniqueOrThrow: m.user, update: m.update }, organization: { create: m.create }, submission: { count: m.count }, classStudent: { count: m.count } }) } }));
import { POST } from "@/app/api/organization/route";
const request = () => new Request("http://localhost/api/organization", { method: "POST", body: JSON.stringify({ name: "Nová škola" }) });
const teacher = { id: "teacher", role: "TEACHER", roles: ["TEACHER", "EVALUATOR"], organizationId: null, isActive: true, emailVerifiedAt: new Date() };
describe("approved school creation", () => {
  beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: teacher }); m.user.mockResolvedValue(teacher); m.count.mockResolvedValue(0); m.create.mockResolvedValue({ id: "school", name: "Nová škola" }); });
  it.each(["USER", "STUDENT", "EVALUATOR"])("rejects %s even with a forged direct request", async (role) => {
    m.session.mockResolvedValue({ user: { ...teacher, role, roles: [role] } }); expect((await POST(request())).status).toBe(403); expect(m.create).not.toHaveBeenCalled();
  });
  it("allows an approved teacher to create a school and become its school administrator", async () => {
    expect((await POST(request())).status).toBe(201); expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "school", roles: ["SCHOOL_ADMIN", "TEACHER", "EVALUATOR"] }) }));
  });
  it("rechecks current database permissions rather than trusting a stale session", async () => {
    m.user.mockResolvedValue({ ...teacher, role: "USER", roles: ["USER"] }); expect((await POST(request())).status).toBe(403); expect(m.create).not.toHaveBeenCalled();
  });
  it("never treats a mixed student role as permission to create a school", async () => {
    m.session.mockResolvedValue({ user: { ...teacher, roles: ["STUDENT", "TEACHER"] } }); expect((await POST(request())).status).toBe(403); expect(m.create).not.toHaveBeenCalled();
  });
});
