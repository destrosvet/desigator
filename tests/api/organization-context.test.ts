import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), organization: vi.fn(), members: vi.fn(), rename: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { organization: { findUnique: m.organization, update: m.rename }, user: { findMany: m.members } } }));
import { GET, PATCH } from "@/app/api/organization/route";
import { organizationTarget, canManageOrganization } from "@/lib/organization-access";
const admin = { id: "admin", role: "ADMIN", roles: ["ADMIN"], organizationId: null };
const schoolAdmin = { id: "school-admin", role: "TEACHER", roles: ["SCHOOL_ADMIN"], organizationId: "school-a" };
const request = (id?: string) => new Request("http://localhost/api/organization" + (id ? "?organizationId=" + id : ""));
describe("platform vs school context", () => {
 beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: admin }); m.organization.mockResolvedValue({ id: "school-b", name: "School B" }); m.members.mockResolvedValue([]); });
 it("a pure platform administrator has no own school, including the old compatibility association", async () => {
   m.session.mockResolvedValue({ user: { ...admin, organizationId: "legacy" } });
   const response = await GET(request()); expect((await response.json()).organization).toBeNull(); expect(m.organization).not.toHaveBeenCalled();
 });
 it("can inspect a selected school without changing membership", async () => {
   const response = await GET(request("school-b")); expect(response.status).toBe(200);
   expect(await response.json()).toMatchObject({ organization: { id: "school-b" }, canManage: true, roles: [] });
   expect(m.members).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "school-b" } }));
 });
 it("does not allow a school administrator to select another school", async () => {
   m.session.mockResolvedValue({ user: schoolAdmin }); expect((await GET(request("school-b"))).status).toBe(403); expect(m.organization).not.toHaveBeenCalled();
   expect(organizationTarget(schoolAdmin, request("school-b"))).toBeNull(); expect(canManageOrganization(schoolAdmin, "school-b")).toBe(false);
 });
 it("keeps combined platform and school roles independent", () => {
   const combined = { ...admin, organizationId: "school-a", roles: ["ADMIN", "SCHOOL_ADMIN", "TEACHER"] };
   expect(organizationTarget(combined, request())).toBe("school-a");
   expect(organizationTarget(combined, request("school-b"))).toBe("school-b");
   expect(canManageOrganization(combined, "school-b")).toBe(true);
 });
 it("renames a selected school under platform permissions without needing a home school", async () => {
   m.rename.mockResolvedValue({ id: "school-b", name: "Changed" });
   const response = await PATCH(new Request("http://localhost/api/organization?organizationId=school-b", { method: "PATCH", body: JSON.stringify({ name: "Changed" }) }));
   expect(response.status).toBe(200); expect(m.rename).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "school-b" } }));
 });
});
