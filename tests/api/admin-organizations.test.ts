import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), list: vi.fn(), update: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { organization: { findMany: m.list, updateMany: m.update } } }));
import { GET, PATCH } from "@/app/api/admin/organizations/route";
const request = (data: unknown) => new Request("http://localhost/api/admin/organizations", { method: "PATCH", body: JSON.stringify(data) });
describe("platform organization registry", () => {
 beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "admin", role: "ADMIN", roles: ["ADMIN"] } }); m.list.mockResolvedValue([]); m.update.mockResolvedValue({ count: 1 }); });
 it.each([null, { user: { id: "t", role: "TEACHER", roles: ["SCHOOL_ADMIN", "TEACHER"], organizationId: "school" } }])("rejects non-platform administrators", async (session) => {
  m.session.mockResolvedValue(session); expect((await GET()).status).toBe(403); expect((await PATCH(request({ id: "school", name: "Changed" }))).status).toBe(403); expect(m.list).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled();
 });
 it("returns a private registry with safe counts", async () => { const response = await GET(); expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store"); expect(m.list).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true, name: true, createdAt: true, _count: { select: { users: true, classes: true } } } })); });
 it("only changes the name, trims it and rejects unknown fields", async () => {
  expect((await PATCH(request({ id: "school", name: "  Nová škola  " }))).status).toBe(200);
  expect(m.update).toHaveBeenCalledWith({ where: { id: "school" }, data: { name: "Nová škola" } });
  m.update.mockClear(); expect((await PATCH(request({ id: "school", name: "New", users: [] }))).status).toBe(400); expect(m.update).not.toHaveBeenCalled();
 });
 it("returns 404 if the organization disappeared", async () => { m.update.mockResolvedValue({ count: 0 }); expect((await PATCH(request({ id: "gone", name: "New" }))).status).toBe(404); });
});
