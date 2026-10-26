import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  taskFindFirst: vi.fn(),
  transaction: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  db: {
    task: { findFirst: mocks.taskFindFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/s3", () => ({ uploadFile: mocks.uploadFile, deleteFile: mocks.deleteFile }));

import { POST } from "@/app/api/submissions/route";

function requestWith(data: FormData) {
  return new Request("http://localhost/api/submissions", { method: "POST", body: data });
}

describe("POST /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
  });

  it("rejects malformed GLB before writing to storage", async () => {
    const data = new FormData(); data.set("taskId", "task-1"); data.append("files", new File(["invalid model"], "work.glb", { type: "application/octet-stream" }));
    expect((await POST(requestWith(data))).status).toBe(400); expect(mocks.uploadFile).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects users who are not students", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const response = await POST(requestWith(new FormData()));
    expect(response.status).toBe(403);
  });

  it("rejects a task outside the student's classes", async () => {
    mocks.taskFindFirst.mockResolvedValue(null);
    const data = new FormData();
    data.set("taskId", "task-1");
    data.set("content", "solution");

    const response = await POST(requestWith(data));
    expect(response.status).toBe(404);
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects submissions after the deadline", async () => {
    mocks.taskFindFirst.mockResolvedValue({ id: "task-1", deadline: new Date(Date.now() - 60_000) });
    const data = new FormData();
    data.set("taskId", "task-1");
    data.set("content", "late solution");

    const response = await POST(requestWith(data));
    expect(response.status).toBe(409);
  });

  it("stores an eligible text submission transactionally", async () => {
    mocks.taskFindFirst.mockResolvedValue({ id: "task-1", deadline: new Date(Date.now() + 60_000) });
    mocks.transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
      submission: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "submission-1" }) },
      attachment: { createMany: vi.fn() },
    }));
    const data = new FormData();
    data.set("taskId", "task-1");
    data.set("content", "solution");

    const response = await POST(requestWith(data));
    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
});