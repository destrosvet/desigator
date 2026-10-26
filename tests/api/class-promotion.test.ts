import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), manage: vi.fn(), source: vi.fn(), transaction: vi.fn(), createClass: vi.fn(), copyStudents: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/authorization", () => ({ canManageClass: m.manage }));
vi.mock("@/lib/db", () => ({ db: { class: { findUnique: m.source }, $transaction: m.transaction } }));
import { POST } from "@/app/api/classes/[id]/promote/route";
const request = (body: unknown = { name: "2pVKP", academicYear: 2027 }) => POST(new Request("http://localhost/api/classes/old/promote", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "old" }) });
describe("class promotion", () => {
  beforeEach(() => {
    vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "teacher" } }); m.manage.mockResolvedValue(true);
    m.source.mockResolvedValue({ organizationId: "school", teacherId: "teacher", description: "Group", students: [{ studentId: "s1" }, { studentId: "s2" }] });
    m.createClass.mockResolvedValue({ id: "new", name: "2pVKP" });
    m.transaction.mockImplementation(async (run) => run({ class: { create: m.createClass }, classStudent: { createMany: m.copyStudents } }));
  });
  it("copies the whole roster into a new academic-year group without modifying the source", async () => {
    const response = await request(); expect(response.status).toBe(201); expect(await response.json()).toMatchObject({ copiedStudents: 2, class: { id: "new" } });
    expect(m.createClass).toHaveBeenCalledWith({ data: expect.objectContaining({ name: "2pVKP", academicYear: 2027, organizationId: "school", teacherId: "teacher" }) });
    expect(m.copyStudents).toHaveBeenCalledWith({ data: [{ classId: "new", studentId: "s1" }, { classId: "new", studentId: "s2" }], skipDuplicates: true });
  });
  it("requires management permission and valid input", async () => { m.manage.mockResolvedValue(false); expect((await request()).status).toBe(403); expect(m.source).not.toHaveBeenCalled(); m.manage.mockResolvedValue(true); expect((await request({ name: "", academicYear: 1900 })).status).toBe(400); });
});