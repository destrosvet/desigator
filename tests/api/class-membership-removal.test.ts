import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), manage: vi.fn(), remove: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/authorization", () => ({ canManageClass: m.manage }));
vi.mock("@/lib/db", () => ({ db: { classStudent: { deleteMany: m.remove } } }));
import { DELETE } from "@/app/api/classes/[id]/students/route";
const params = { params: Promise.resolve({ id: "source" }) };
const request = (body: unknown) => new Request("http://localhost", { method: "DELETE", body: JSON.stringify(body) });
describe("class membership removal", () => {
  beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } }); m.manage.mockResolvedValue(true); });
  it.each([{ studentId: "one" }, { studentIds: ["one", "two"] }])("removes only source memberships and preserves accounts: %j", async body => {
    expect((await DELETE(request(body), params)).status).toBe(200);
    expect(m.remove).toHaveBeenCalledWith({ where: { classId: "source", studentId: { in: "studentIds" in body ? body.studentIds : [body.studentId] } } });
  });
  it.each([{}, { studentIds: [] }, { studentIds: [""] }])("rejects invalid membership batches: %j", async body => { expect((await DELETE(request(body), params)).status).toBe(400); expect(m.remove).not.toHaveBeenCalled(); });
  it("rejects malformed JSON without server error", async () => { expect((await DELETE(new Request("http://localhost", { method: "DELETE", body: "{" }), params)).status).toBe(400); });
  it("does not remove memberships from an inaccessible group", async () => { m.manage.mockResolvedValue(false); expect((await DELETE(request({ studentIds: ["one"] }), params)).status).toBe(403); expect(m.remove).not.toHaveBeenCalled(); });
});
