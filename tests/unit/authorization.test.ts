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

  it("allows administrators only when the target class exists", async () => {
    dbMock.class.findFirst.mockResolvedValueOnce({ id: "class-1" }).mockResolvedValueOnce(null);
    await expect(canManageClass({ id: "admin", role: "ADMIN" }, "class-1")).resolves.toBe(true);
    await expect(canManageClass({ id: "admin", role: "ADMIN" }, "missing")).resolves.toBe(false);
    expect(dbMock.class.findFirst).toHaveBeenCalledWith({
      where: { id: "class-1" },
      select: { id: true },
    });
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
  it("lets a teacher complete another evaluator's review within their own managed task, but not elsewhere", async () => {
    const teacher = { id: "teacher", role: "TEACHER", organizationId: "school" };
    dbMock.evaluation.findFirst
      .mockResolvedValueOnce({ id: "evaluation-1" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    await expect(canManageEvaluation(teacher, "evaluation-1")).resolves.toBe(true);
    expect(dbMock.evaluation.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: "evaluation-1", submission: { task: { subject: { classes: { some: { class: { organizationId: "school" } } } }, creatorId: "teacher" } } },
      select: { id: true },
    });
    await expect(canManageEvaluation(teacher, "evaluation-2")).resolves.toBe(false);
    expect(dbMock.evaluation.findFirst).toHaveBeenCalledTimes(3);
  });
  it("allows subject managers to request final work thumbnails without granting original file access", async () => {
    const teacher = { id: "teacher", role: "TEACHER", organizationId: "school" };
    await canReadAttachment(teacher, "attachment-1", true);
    const thumbnailScope = { submission: { stage: "FINAL", task: { status: { in: ["PUBLISHED", "CLOSED"] }, isTemplate: false, subject: { teacherId: teacher.id, classes: { some: { class: { organizationId: "school" } } } } } } };
    expect(dbMock.attachment.findFirst.mock.lastCall?.[0].where.OR).toContainEqual(thumbnailScope);
    await canReadAttachment(teacher, "attachment-1");
    expect(dbMock.attachment.findFirst.mock.lastCall?.[0].where.OR).not.toContainEqual(thumbnailScope);
  });
});
