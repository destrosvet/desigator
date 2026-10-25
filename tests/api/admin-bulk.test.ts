import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), remove: vi.fn(), update: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session })); vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/admin-records", () => ({ deleteAdminRecords: m.remove, setTaskStatuses: m.update, AdminRecordError: class extends Error {} }));
import { DELETE } from "@/app/api/admin/[entity]/bulk/route";
describe("explicit bulk confirmation", () => {
 beforeEach(() => { vi.clearAllMocks(); m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } }); });
 it.each([{ ids: ["a"] }, { ids: ["a"], confirmed: false }, { ids: [], confirmed: true }, { ids: ["a", "a"], confirmed: true }])("rejects invalid selection without mutations: %j", async (body) => { const response = await DELETE(new Request("http://localhost/api/admin/tasks/bulk", { method: "DELETE", body: JSON.stringify(body) }), { params: Promise.resolve({ entity: "tasks" }) }); expect(response.status).toBe(400); expect(m.remove).not.toHaveBeenCalled(); });
});
