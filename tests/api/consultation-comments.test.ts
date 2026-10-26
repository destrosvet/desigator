import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), submission: vi.fn(), manage: vi.fn(), view: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), limit: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/authorization", () => ({ canManageTask: m.manage, canViewTask: m.view }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: m.limit }));
vi.mock("@/lib/db", () => ({ db: { submission: { findUnique: m.submission }, consultationComment: { findMany: m.findMany, findFirst: m.findFirst, create: m.create } } }));
import { GET, POST } from "@/app/api/submissions/[id]/comments/route";
const params = { params: Promise.resolve({ id: "wip" }) };
const get = (query = "") => GET(new Request("http://localhost/api/submissions/wip/comments" + query), params);
const post = (content: unknown = "Feedback") => POST(new Request("http://localhost/api/submissions/wip/comments", { method: "POST", body: JSON.stringify({ content }) }), params);
describe("version-specific WIP consultations", () => {
 beforeEach(() => {
  vi.resetAllMocks();
  m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } });
  m.submission.mockResolvedValue({ id: "wip", taskId: "task", studentId: "student", stage: "WIP" });
  m.manage.mockResolvedValue(true); m.view.mockResolvedValue(true); m.findMany.mockResolvedValue([]); m.limit.mockReturnValue({ allowed: true });
 });
 it("denies anonymous access without reading the database", async () => {
  m.session.mockResolvedValue(null);
  expect((await get()).status).toBe(401); expect((await post()).status).toBe(401); expect(m.submission).not.toHaveBeenCalled();
 });
 it("denies unrelated students and unassigned or external evaluators", async () => {
  m.manage.mockResolvedValue(false);
  for (const user of [{ id: "other-student", role: "STUDENT" }, { id: "evaluator", role: "EVALUATOR" }]) {
   m.session.mockResolvedValue({ user }); expect((await get()).status).toBe(404); expect((await post()).status).toBe(404);
  }
  expect(m.findMany).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
 });
 it("allows the owner only while the task is visible", async () => {
  m.session.mockResolvedValue({ user: { id: "student", role: "STUDENT" } }); m.manage.mockResolvedValue(false);
  expect((await get()).status).toBe(200);
  m.view.mockResolvedValue(false); expect((await get()).status).toBe(404); expect((await post()).status).toBe(404);
 });
 it("keeps consultations separate from final grading", async () => {
  m.submission.mockResolvedValue({ id: "wip", taskId: "task", studentId: "student", stage: "FINAL" });
  expect((await get()).status).toBe(409); expect((await post()).status).toBe(409); expect(m.create).not.toHaveBeenCalled();
 });
 it("validates the entire message before writing", async () => {
  for (const content of [" ", "a".repeat(5001), null, 123]) expect((await post(content)).status).toBe(400);
  expect(m.create).not.toHaveBeenCalled();
 });
 it("persists the authenticated author and version and returns no account secrets", async () => {
  const comment = { id: "c1", content: "Feedback", createdAt: new Date().toISOString(), author: { id: "teacher", name: "Teacher" } };
  m.create.mockResolvedValue(comment);
  const response = await post("  Feedback  "); expect(response.status).toBe(201); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ comment });
  expect(m.create.mock.calls[0][0].data).toEqual({ submissionId: "wip", authorId: "teacher", content: "Feedback" });
  expect(m.create.mock.calls[0][0].select.author.select).toEqual({ id: true, name: true });
 });
 it("bounds each page, preserves chronology, and scopes cursors to the same version", async () => {
  m.findMany.mockResolvedValue(Array.from({ length: 51 }, (_, index) => ({ id: "c" + (51 - index) })));
  const response = await get(); const data = await response.json();
  expect(data.comments).toHaveLength(50); expect(data.comments[0].id).toBe("c2"); expect(data.comments[49].id).toBe("c51"); expect(data.nextCursor).toBe("c2");
  expect(m.findMany.mock.calls[0][0].where).toEqual({ submissionId: "wip" });
  m.findFirst.mockResolvedValue(null); expect((await get("?before=foreign-comment")).status).toBe(400);
  m.findFirst.mockResolvedValue({ id: "c2" }); expect((await get("?before=c2")).status).toBe(200);
  expect(m.findMany.mock.calls[1][0]).toMatchObject({ where: { submissionId: "wip" }, cursor: { id: "c2" }, skip: 1 });
 });
 it("limits repeated posting and preserves a retry delay", async () => {
  m.limit.mockReturnValue({ allowed: false, retryAfter: 42 }); const response = await post(); expect(response.status).toBe(429); expect(response.headers.get("retry-after")).toBe("42"); expect(m.create).not.toHaveBeenCalled();
 });
 it("returns a recoverable error on a storage failure", async () => {
  m.create.mockRejectedValue(new Error("DB failure")); expect((await post()).status).toBe(500);
 });
});
