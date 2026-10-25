import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), manage: vi.fn(), view: vi.fn(), transaction: vi.fn(), upload: vi.fn(), remove: vi.fn(), create: vi.fn(), find: vi.fn(), deleteMany: vi.fn(), lock: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/authorization", () => ({ canManageTask: m.manage, canViewTask: m.view }));
vi.mock("@/lib/db", () => ({ db: { $transaction: m.transaction, attachment: { findMany: m.find } } }));
vi.mock("@/lib/s3", () => ({ uploadFile: m.upload, deleteFile: m.remove }));
import { POST, DELETE } from "@/app/api/tasks/[id]/attachments/route";
const params = { params: Promise.resolve({ id: "t1" }) };
function upload(mime = "image/png", count = 1) { const data = new FormData(); for (let i = 0; i < count; i++) data.append("files", new File(["file"], "reference" + i + ".png", { type: mime })); return new Request("http://localhost", { method: "POST", body: data }); }
function remove(ids: string[], confirmed = true) { return new Request("http://localhost", { method: "DELETE", body: JSON.stringify({ ids, confirmed }) }); }
describe("assignment reference attachment mutations", () => {
 beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } }); m.manage.mockResolvedValue(true); m.remove.mockResolvedValue(undefined); m.upload.mockResolvedValue(undefined); m.transaction.mockImplementation(async (run) => run({ $queryRaw: m.lock, attachment: { createMany: m.create, findMany: m.find, deleteMany: m.deleteMany } })); });
 it("rejects outsiders and unsupported files before storage writes", async () => {
  m.manage.mockResolvedValueOnce(false); expect((await POST(upload(), params)).status).toBe(403);
  expect((await POST(upload("text/html"), params)).status).toBe(415); expect(m.upload).not.toHaveBeenCalled();
 });
 it("cleans uploaded files if database persistence fails", async () => {
  m.create.mockRejectedValue(new Error("DB failure")); expect((await POST(upload(), params)).status).toBe(500); expect(m.remove).toHaveBeenCalledTimes(1);
 });
 it("cleans earlier uploads when a later storage write fails", async () => {
  m.upload.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Storage failure"));
  expect((await POST(upload("image/png", 2), params)).status).toBe(500); expect(m.transaction).not.toHaveBeenCalled(); expect(m.remove).toHaveBeenCalledTimes(1);
 });
 it("does not delete any attachment when one ID is foreign or confirmation is missing", async () => {
  expect((await DELETE(remove(["a"], false), params)).status).toBe(400);
  m.find.mockResolvedValue([{ id: "a", s3Key: "key" }]); expect((await DELETE(remove(["a", "foreign"]), params)).status).toBe(404); expect(m.deleteMany).not.toHaveBeenCalled(); expect(m.remove).not.toHaveBeenCalled();
 });
});
