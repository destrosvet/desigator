import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), transaction: vi.fn(), hash: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/admin-records", () => ({ studentScope: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findMany: m.findMany, findUnique: m.findUnique, create: m.create }, $transaction: m.transaction } }));
vi.mock("bcryptjs", () => ({ default: { hash: m.hash } }));
import { POST } from "@/app/api/students/route";
const request = (body: unknown) => new Request("http://localhost/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("student creation", () => {
 beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER", organizationId: "school" } }); m.findMany.mockResolvedValue([]); m.findUnique.mockResolvedValue(null); m.hash.mockResolvedValue("hashed"); m.create.mockImplementation(async ({ data }) => ({ id: data.email, email: data.email })); m.transaction.mockImplementation(async run => run({ user: { create: m.create } })); });
 it.each([null, { emails: [] }, { emails: "student@example.cz" }, { emails: ["good@example.cz", "invalid"] }, { emails: ["A@example.cz", "a@example.cz"] }, { emails: Array(201).fill("a@example.cz") }])("rejects the entire malformed batch before hashing or writing: %j", async body => {
   expect((await POST(request(body))).status).toBe(400); expect(m.hash).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
 });
 it("normalizes emails, skips existing accounts and returns only new credentials without caching", async () => {
   m.findMany.mockResolvedValue([{ email: "old@example.cz" }]);
   const response = await POST(request({ emails: [" New@Example.cz ", "old@example.cz"] }));
   expect(response.status).toBe(201); expect(response.headers.get("Cache-Control")).toBe("no-store");
   const data = await response.json(); expect(data.added).toBe(1); expect(data.skipped).toBe(1); expect(data.students[0]).toEqual({ email: "new@example.cz", id: "new@example.cz", tempPassword: expect.stringMatching(/^[A-Za-z0-9_-]{24}$/) });
   expect(m.transaction).toHaveBeenCalledOnce(); expect(m.create).toHaveBeenCalledOnce(); expect(m.create.mock.calls[0][0].data).toMatchObject({ organizationId: "school", role: "STUDENT", password: "hashed" });
 });
 it("reports concurrent email conflicts without returning partial credentials", async () => {
   m.transaction.mockRejectedValue({ code: "P2002" }); const response = await POST(request({ emails: ["new@example.cz"] })); expect(response.status).toBe(409); expect((await response.json()).students).toBeUndefined();
 });
 it("never allows an unauthorized role to create accounts", async () => {
   m.session.mockResolvedValue({ user: { id: "student", role: "STUDENT" } }); expect((await POST(request({ emails: ["new@example.cz"] }))).status).toBe(401); expect(m.create).not.toHaveBeenCalled();
 });
});
