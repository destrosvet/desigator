import { describe, expect, it } from "vitest";
import { matchingReviewQueue, reviewFilterQuery } from "@/lib/review-filters";
import { draftFromWork, type ReviewWork } from "@/lib/review-workspace";

describe("review filter context", () => {
 it("round-trips search, status, people and pagination without allowing a return URL", () => {
  const query = reviewFilterQuery({ taskId: "task", status: "PENDING", search: "A & B + C", studentId: "student", evaluatorId: "reviewer", page: 2, limit: 1, ...{ returnTo: "https://example.test" } });
  const params = new URLSearchParams(query);
  expect(Object.fromEntries(params)).toEqual({ taskId: "task", status: "PENDING", search: "A & B + C", studentId: "student", evaluatorId: "reviewer", page: "2", limit: "1" });
 });
 it("keeps the open work visible after saving but removes completed neighbors from a pending queue", () => {
  const queue = [{ id: "done", status: "COMPLETED", totalPoints: 10 }, { id: "current", status: "IN_PROGRESS", totalPoints: 3 }, { id: "next", status: "PENDING", totalPoints: null }];
  expect(matchingReviewQueue(queue, "current", "PENDING").map(item => item.id)).toEqual(["current", "next"]);
  expect(matchingReviewQueue(queue, "next", "PENDING").map(item => item.id)).toEqual(["next"]);
  expect(matchingReviewQueue(queue, "current").map(item => item.id)).toEqual(["done", "current", "next"]);
 });
 it("uses edit permissions of the loaded review", () => {
  const work: ReviewWork = { id: "review", canEdit: false, status: "PENDING", totalPoints: null, feedback: null, evaluator: { name: "Other reviewer" }, scores: [], submission: { content: null, attachments: [], task: { id: "task", title: "Task", description: null, instructions: null, maxPoints: 10, criteria: [] } } };
  expect(draftFromWork(work).readOnly).toBe(true);
  expect(draftFromWork({ ...work, canEdit: true }).readOnly).toBe(false);
 });
});
