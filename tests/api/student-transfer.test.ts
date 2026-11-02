import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), classes: vi.fn(), source: vi.fn(), users: vi.fn(), create: vi.fn(), remove: vi.fn(), lock: vi.fn(), transaction: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { class: { findFirst: m.source, findMany: m.classes }, $transaction: m.transaction } }));
import { GET, POST } from "@/app/api/classes/[id]/students/transfer/route";
const params = { params: Promise.resolve({ id: "source" }) };
const request = (body: unknown) => new Request("http://localhost/api/classes/source/students/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const body = { targetClassId: "target", studentIds: ["one", "two"] };
describe("student group transfers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER", roles: ["TEACHER"], organizationId: "school" } });
    m.classes.mockResolvedValue([{ id: "source", organizationId: "school" }, { id: "target", organizationId: "school" }]);
    m.users.mockResolvedValue([{ id: "one" }, { id: "two" }]);
    m.source.mockResolvedValue({ organizationId: "school" });
    m.transaction.mockImplementation(run => run({ class: { findMany: m.classes }, user: { findMany: m.users }, classStudent: { createMany: m.create, deleteMany: m.remove }, $queryRaw: m.lock }));
  });
  it("moves the whole batch, tolerates existing destination memberships and touches no account or work", async () => {
    const response = await POST(request(body), params);
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ transferred: 2 });
    expect(m.create).toHaveBeenCalledWith({ data: [{ classId: "target", studentId: "one" }, { classId: "target", studentId: "two" }], skipDuplicates: true });
    expect(m.remove).toHaveBeenCalledWith({ where: { classId: "source", studentId: { in: ["one", "two"] } } });
    expect(m.create.mock.invocationCallOrder[0]).toBeLessThan(m.remove.mock.invocationCallOrder[0]);
    expect(m.lock).toHaveBeenCalledTimes(2);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it.each([null, {}, { ...body, studentIds: [] }, { ...body, studentIds: ["one", "one"] }, { ...body, studentIds: Array.from({ length: 201 }, (_, i) => String(i)) }, { ...body, targetClassId: "source" }, { ...body, studentIds: [""] }])("rejects invalid batches before writing: %j", async input => {
    expect((await POST(request(input), params)).status).toBe(400); expect(m.transaction).not.toHaveBeenCalled();
  });
  it.each([null, { user: { id: "student", role: "STUDENT" } }, { user: { id: "evaluator", role: "EVALUATOR" } }])("rejects unauthorized actors: %j", async session => {
    m.session.mockResolvedValue(session); expect((await POST(request(body), params)).status).toBe(session ? 403 : 401); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("checks both groups in the teacher's school and management scope", async () => {
    await POST(request(body), params);
    expect(m.classes.mock.calls[0][0].where.AND).toContainEqual({ organizationId: "school", teacherId: "teacher" });
    m.classes.mockResolvedValue([{ id: "source", organizationId: "school" }]);
    expect((await POST(request(body), params)).status).toBe(403);
    expect(m.remove).toHaveBeenCalledTimes(1);
  });
  it("refuses a cross-school transfer even for platform administrators", async () => {
    m.session.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
    m.classes.mockResolvedValue([{ id: "source", organizationId: "school" }, { id: "target", organizationId: "other" }]);
    expect((await POST(request(body), params)).status).toBe(409); expect(m.create).not.toHaveBeenCalled(); expect(m.remove).not.toHaveBeenCalled();
  });
  it("allows school administrators without a teacher role within their school", async () => {
    m.session.mockResolvedValue({ user: { id: "school-admin", role: "TEACHER", roles: ["SCHOOL_ADMIN"], organizationId: "school" } });
    expect((await POST(request(body), params)).status).toBe(200);
    expect(m.classes.mock.calls[0][0].where.AND).toContainEqual({ organizationId: "school" });
  });
  it("rejects the whole batch if any student left the source or is inactive or outside the school", async () => {
    m.users.mockResolvedValue([{ id: "one" }]);
    const response = await POST(request(body), params);
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ error: "membershipChanged" });
    expect(m.create).not.toHaveBeenCalled(); expect(m.remove).not.toHaveBeenCalled();
    expect(m.users.mock.calls[0][0].where).toMatchObject({ organizationId: "school", isActive: true, classMemberships: { some: { classId: "source" } } });
  });
  it("does not remove source membership if creating the destination fails", async () => {
    m.create.mockRejectedValue(new Error("database failure"));
    expect((await POST(request(body), params)).status).toBe(500); expect(m.remove).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON", async () => {
    expect((await POST(new Request("http://localhost", { method: "POST", body: "{" }), params)).status).toBe(400);
  });
  it("returns only other active managed groups from the source school", async () => {
    expect((await GET(new Request("http://localhost"), params)).status).toBe(200);
    expect(m.classes.mock.calls[0][0].where.AND).toEqual([{ id: { not: "source" }, organizationId: "school", isActive: true }, { organizationId: "school", teacherId: "teacher" }]);
  });
  it("does not list destination groups for an inaccessible source", async () => {
    m.source.mockResolvedValue(null); expect((await GET(new Request("http://localhost"), params)).status).toBe(403); expect(m.classes).not.toHaveBeenCalled();
  });
});
