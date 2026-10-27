import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), manage: vi.fn(), transaction: vi.fn(), lock: vi.fn(), task: vi.fn(), update: vi.fn(), clear: vi.fn(), summary: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/authorization", () => ({ canManageTask: m.manage }));
vi.mock("@/lib/db", () => ({ db: { $transaction: m.transaction } }));
vi.mock("@/lib/task-result-publication", () => ({ readTaskPublication: m.summary }));
import { GET, PATCH } from "@/app/api/tasks/[id]/publication/route";
const params = { params: Promise.resolve({ id: "task" }) };
const request = (body: unknown = { published: true }) => PATCH(new Request("http://localhost/api/tasks/task/publication", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), params);
describe("live publication of a whole task", () => {
 beforeEach(() => {
  vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } }); m.manage.mockResolvedValue(true);
  m.task.mockResolvedValue({ status: "PUBLISHED", resultsPublishedAt: null });
  m.summary.mockResolvedValue({ enabled: true, publishedAt: "2026-10-27T12:00:00Z", total: 50, completed: 20, pending: 30, draft: false });
  m.transaction.mockImplementation(run => run({ $queryRaw: m.lock, task: { findUnique: m.task, update: m.update }, submission: { updateMany: m.clear } }));
 });
 it("requires authentication for reading and changing publication", async () => {
  m.session.mockResolvedValue(null); expect((await request()).status).toBe(401);
  expect((await GET(new Request("http://localhost"), params)).status).toBe(401); expect(m.transaction).not.toHaveBeenCalled();
 });
 it.each(["STUDENT", "EVALUATOR", "TEACHER"])("rejects a %s without task management rights", async role => {
  m.session.mockResolvedValue({ user: { id: "other", role } }); m.manage.mockResolvedValue(false);
  expect((await request()).status).toBe(403); expect((await GET(new Request("http://localhost"), params)).status).toBe(403); expect(m.transaction).not.toHaveBeenCalled();
 });
 it.each([{}, { published: "true" }, { published: true, resultsPublishedById: "spoofed" }])("rejects malformed or spoofed input %j", async body => {
  expect((await request(body)).status).toBe(400); expect(m.transaction).not.toHaveBeenCalled();
 });
 it("enables live publication even when only 20 of 50 works are completed", async () => {
  const response = await request(); expect(response.status).toBe(200);
  expect((await response.json()).summary).toMatchObject({ enabled: true, completed: 20, pending: 30 });
  expect(m.update).toHaveBeenCalledWith({ where: { id: "task" }, data: { resultsPublishedAt: expect.any(Date), resultsPublishedById: "teacher" } });
  expect(m.clear).not.toHaveBeenCalled(); expect(response.headers.get("cache-control")).toContain("no-store");
 });
 it("does not reset the original publication timestamp on a repeated enable", async () => {
  m.task.mockResolvedValue({ status: "PUBLISHED", resultsPublishedAt: new Date() });
  expect((await request()).status).toBe(200); expect(m.update).not.toHaveBeenCalled();
 });
 it("clears older individual publication when the teacher hides the task", async () => {
  m.task.mockResolvedValue({ status: "PUBLISHED", resultsPublishedAt: new Date() });
  expect((await request({ published: false })).status).toBe(200);
  expect(m.update).toHaveBeenCalledWith({ where: { id: "task" }, data: { resultsPublishedAt: null, resultsPublishedById: null } });
  expect(m.clear).toHaveBeenCalledWith({ where: { taskId: "task", resultsPublishedAt: { not: null } }, data: { resultsPublishedAt: null, resultsPublishedById: null } });
 });
 it("does not enable results of a draft assignment", async () => {
  m.task.mockResolvedValue({ status: "DRAFT", resultsPublishedAt: null });
  expect((await request()).status).toBe(409); expect(m.update).not.toHaveBeenCalled();
 });
});
