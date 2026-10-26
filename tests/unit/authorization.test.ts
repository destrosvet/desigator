import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  class: { findFirst: vi.fn() },
  subject: { findFirst: vi.fn() },
  task: { findFirst: vi.fn() },
  attachment: { findFirst: vi.fn() },
  evaluation: { findFirst: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import {
  canManageClass,
  canManageEvaluation,
  canManageTask,
  canReadAttachment,
  canViewTask,
} from "@/lib/authorization";

describe("object authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows administrators without querying ownership", async () => {
    await expect(canManageClass({ id: "admin", role: "ADMIN" }, "class-1")).resolves.toBe(true);
    expect(dbMock.class.findFirst).not.toHaveBeenCalled();
  });

  it("allows a teacher only when the owned class exists", async () => {
    dbMock.class.findFirst.mockResolvedValueOnce({ id: "class-1" }).mockResolvedValueOnce(null);
    await expect(canManageClass({ id: "teacher", role: "TEACHER", organizationId: "school-a" }, "class-1")).resolves.toBe(true);
    await expect(canManageClass({ id: "teacher", role: "TEACHER", organizationId: "school-a" }, "class-2")).resolves.toBe(false);
    expect(dbMock.class.findFirst).toHaveBeenCalledWith({
      where: { id: "class-1", organizationId: "school-a", teacherId: "teacher" },
      select: { id: true },
    });
  });

  it("rejects non-teachers from managing tasks", async () => {
    await expect(canManageTask({ id: "student", role: "STUDENT" }, "task-1")).resolves.toBe(false);
    expect(dbMock.task.findFirst).not.toHaveBeenCalled();
  });

  it("delegates task visibility, attachment access and evaluation access to scoped queries", async () => {
    dbMock.task.findFirst.mockResolvedValue({ id: "task-1" });
    dbMock.attachment.findFirst.mockResolvedValue({ id: "attachment-1" });
    dbMock.evaluation.findFirst.mockResolvedValue(null);

    await expect(canViewTask({ id: "student", role: "STUDENT" }, "task-1")).resolves.toBe(true);
    await expect(canReadAttachment({ id: "student", role: "STUDENT" }, "attachment-1")).resolves.toBe(true);
    await expect(canManageEvaluation({ id: "evaluator", role: "EVALUATOR" }, "evaluation-1")).resolves.toBe(false);
  });
});