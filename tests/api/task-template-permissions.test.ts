import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), list: vi.fn(), update: vi.fn(), count: vi.fn(), remove: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: {
  assignmentTemplate: { findMany: m.list, updateMany: m.update },
  $transaction: (fn: (tx: unknown) => unknown) => fn({ assignmentTemplate: { count: m.count, deleteMany: m.remove } }),
} }));
import { GET, PATCH, DELETE } from "@/app/api/task-templates/route";
const template = { id: "foreign", title: "Template", maxPoints: 100, criteria: [{ name: "Design", maxPoints: 100 }] };
const request = (data: object) => new Request("http://localhost/api/task-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
describe("template ownership and platform administration", () => {
  beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER", roles: ["TEACHER"] } }); m.list.mockResolvedValue([]); m.update.mockResolvedValue({ count: 0 }); m.count.mockResolvedValue(0); });
  it("limits ordinary teachers to their own templates", async () => {
    expect((await GET()).status).toBe(200);
    expect(m.list).toHaveBeenCalledWith(expect.objectContaining({ where: { creatorId: "teacher" } }));
  });
  it("cannot update another teacher's template", async () => {
    expect((await PATCH(request(template))).status).toBe(404);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign", creatorId: "teacher" } }));
  });
  it("rejects a mixed deletion selection before deleting any templates", async () => {
    m.count.mockResolvedValue(1);
    expect((await DELETE(request({ ids: ["owned", "foreign"], confirmed: true }))).status).toBe(404);
    expect(m.count).toHaveBeenCalledWith({ where: { id: { in: ["owned", "foreign"] }, creatorId: "teacher" } });
    expect(m.remove).not.toHaveBeenCalled();
  });
  it("allows platform administrators to list and update all templates", async () => {
    m.session.mockResolvedValue({ user: { id: "admin", role: "ADMIN", roles: ["ADMIN"] } }); m.update.mockResolvedValue({ count: 1 });
    expect((await GET()).status).toBe(200); expect(m.list).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    expect((await PATCH(request(template))).status).toBe(200); expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign" } }));
  });
  it("allows an administrator to delete an explicitly confirmed template", async () => {
    m.session.mockResolvedValue({ user: { id: "admin", role: "ADMIN", roles: ["ADMIN"] } }); m.count.mockResolvedValue(1);
    expect((await DELETE(request({ ids: ["foreign"], confirmed: true }))).status).toBe(200);
    expect(m.remove).toHaveBeenCalledWith({ where: { id: { in: ["foreign"] } } });
  });
  it("does not allow evaluator accounts to manage templates", async () => {
    m.session.mockResolvedValue({ user: { id: "evaluator", role: "EVALUATOR", roles: ["EVALUATOR"] } });
    expect((await GET()).status).toBe(403); expect((await PATCH(request(template))).status).toBe(403);
    expect((await DELETE(request({ ids: ["foreign"], confirmed: true }))).status).toBe(403);
  });
});
