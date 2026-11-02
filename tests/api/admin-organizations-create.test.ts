import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), create: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { organization: { create: m.create } } }));
import { POST } from "@/app/api/admin/organizations/route";
const request = (data: unknown) => new Request("http://localhost/api/admin/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
describe("platform organization creation", () => {
  beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "admin", role: "ADMIN", roles: ["ADMIN"], organizationId: "existing-school" } }); m.create.mockResolvedValue({ id: "new-school", name: "Nová škola" }); });
  it("allows an administrator to create multiple schools without changing membership", async () => {
    expect((await POST(request({ name: "  Nová škola  " }))).status).toBe(201);
    expect(m.create).toHaveBeenCalledWith({ data: { name: "Nová škola" }, select: { id: true, name: true } });
    expect((await POST(request({ name: "Další škola" }))).status).toBe(201);
  });
  it("rejects anonymous users and school staff", async () => {
    m.session.mockResolvedValue(null); expect((await POST(request({ name: "Škola" }))).status).toBe(403);
    m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER", roles: ["SCHOOL_ADMIN", "TEACHER"] } });
    expect((await POST(request({ name: "Škola" }))).status).toBe(403); expect(m.create).not.toHaveBeenCalled();
  });
  it("validates names and rejects extra fields", async () => {
    for (const data of [{ name: " " }, { name: "x".repeat(201) }, { name: "Škola", organizationId: "other" }]) expect((await POST(request(data))).status).toBe(400);
    expect(m.create).not.toHaveBeenCalled();
  });
  it("returns a useful error on database failure", async () => {
    m.create.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(request({ name: "Škola" })); expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Organizaci se nepodařilo vytvořit.");
  });
});
