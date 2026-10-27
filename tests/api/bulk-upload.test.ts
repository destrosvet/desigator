import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), manage: vi.fn(), task: vi.fn(), roster: vi.fn(), count: vi.fn(), transaction: vi.fn(), upload: vi.fn(), remove: vi.fn(), create: vi.fn(), latest: vi.fn(), attachments: vi.fn(), receipt: vi.fn(), saveReceipt: vi.fn(), lock: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/authorization", () => ({ canManageTask: m.manage }));
vi.mock("@/lib/db", () => ({ db: { bulkSubmissionImport: { findUnique: m.receipt }, task: { findUnique: m.task }, classStudent: { findMany: m.roster }, submission: { count: m.count }, $transaction: m.transaction } }));
vi.mock("@/lib/s3", () => ({ uploadFile: m.upload, deleteFile: m.remove }));
import { POST } from "@/app/api/submissions/bulk-upload/route";
function request(ids = ["s1"], confirmed = true, names = ["4464341_02.jpg"]) {
 const data = new FormData(); data.set("taskId", "t1"); data.set("studentIds", JSON.stringify(ids)); if (confirmed) data.set("confirmed", "true");
 for (const name of names) data.append("files", new File(["image"], name, { type: "image/jpeg" }));
 return new Request("http://localhost/api/submissions/bulk-upload", { method: "POST", body: data });
}
describe("confirmed teacher import", () => {
 beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } }); m.manage.mockResolvedValue(true); m.task.mockResolvedValue({ subject: { classes: [{ classId: "c1" }] } }); m.roster.mockResolvedValue([{ student: { id: "s1", name: "Student", externalId: "4464341" } }]); m.receipt.mockResolvedValue(null); m.saveReceipt.mockResolvedValue({}); m.upload.mockResolvedValue(undefined); m.remove.mockResolvedValue(undefined); m.count.mockResolvedValue(0); m.latest.mockResolvedValue(null); m.create.mockResolvedValue({ id: "work" }); m.transaction.mockImplementation(async (run) => run({ $queryRaw: m.lock, bulkSubmissionImport: { findUnique: m.receipt, create: m.saveReceipt }, submission: { create: m.create, findFirst: m.latest }, attachment: { createMany: m.attachments } })); });
 it.each([[false, ["s1"]], [true, ["foreign"]], [true, []]])("rejects invalid confirmation/map without upload or write (%s, %j)", async (confirmed, ids) => { const res = await POST(request(ids, confirmed)); expect(res.status).toBe(400); expect(m.upload).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled(); });
 it("rejects an unauthorized task before loading the roster", async () => { m.manage.mockResolvedValue(false); expect((await POST(request())).status).toBe(403); expect(m.roster).not.toHaveBeenCalled(); expect(m.upload).not.toHaveBeenCalled(); });
 it("rejects external GLB resources before upload", async () => {
  const data = new FormData(); data.set("taskId", "t1"); data.set("studentIds", '["s1"]'); data.set("confirmed", "true"); data.append("files", new File(["invalid model"], "model.glb", { type: "application/octet-stream" }));
  expect((await POST(new Request("http://localhost/api/submissions/bulk-upload", { method: "POST", body: data }))).status).toBe(400); expect(m.upload).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled();
 });
 it("creates a new WIP version without changing previous work", async () => { m.latest.mockResolvedValue({ version: 2 }); const req = request(); const data = await req.formData(); data.set("stage", "WIP"); const res = await POST(new Request(req.url, { method: "POST", body: data })); expect(res.status).toBe(200); expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ version: 3, stage: "WIP", uploadedById: "teacher" }) }); });
 it("rejects duplicate views before uploading", async () => { expect((await POST(request(["s1", "s1"], true, ["4464341_02.jpg", "4464341_02.jpg"]))).status).toBe(400); expect(m.upload).not.toHaveBeenCalled(); });
 it("groups manually assigned files into one student work", async () => { const res = await POST(request(["s1", "s1"], true, ["unknown.jpg", "4464341_02.jpg"])); expect(res.status).toBe(200); expect(m.create).toHaveBeenCalledTimes(1); expect(m.attachments.mock.calls[0][0].data).toHaveLength(2); expect(m.upload).toHaveBeenCalledTimes(2); });
 it("accepts a full class batch of 44 images", async () => { const names = Array.from({ length: 44 }, (_, index) => `4464341_${index + 1}.jpg`); const res = await POST(request(names.map(() => "s1"), true, names)); expect(res.status).toBe(200); expect(m.upload).toHaveBeenCalledTimes(44); });
 it("rejects more than 100 files before upload", async () => { const names = Array.from({ length: 101 }, (_, index) => `4464341_${index + 1}.jpg`); const res = await POST(request(names.map(() => "s1"), true, names)); expect(res.status).toBe(400); expect(m.upload).not.toHaveBeenCalled(); });
 it("cleans uploaded originals when the transaction fails", async () => { m.transaction.mockRejectedValue(new Error("DB failure")); expect((await POST(request())).status).toBe(500); expect(m.remove).toHaveBeenCalledTimes(1); });
 it("does not write if uploading a later file fails", async () => { m.upload.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("S3 failure")); expect((await POST(request(["s1", "s1"], true, ["4464341_01.jpg", "4464341_02.jpg"]))).status).toBe(500); expect(m.transaction).not.toHaveBeenCalled(); expect(m.remove).toHaveBeenCalledTimes(1); });
 it("returns a committed batch without another upload or version", async () => {
   m.receipt.mockResolvedValue({ result: { summary: { total: 1, success: 1 }, results: [] } });
   const response = await POST(request()); expect(response.status).toBe(200); expect((await response.json()).replayed).toBe(true);
   expect(m.upload).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled();
 });
 it("rechecks after the task lock and removes redundant concurrent uploads", async () => {
   m.receipt.mockResolvedValueOnce(null).mockResolvedValueOnce({ result: {} });
   const response = await POST(request()); expect((await response.json()).replayed).toBe(true);
   expect(m.lock).toHaveBeenCalledOnce(); expect(m.create).not.toHaveBeenCalled(); expect(m.saveReceipt).not.toHaveBeenCalled(); expect(m.remove).toHaveBeenCalledOnce();
 });
 it("stores the receipt in the same transaction as new versions", async () => {
   await POST(request()); expect(m.saveReceipt).toHaveBeenCalledWith({ data: expect.objectContaining({ taskId: "t1", fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/) }) });
 });

});
