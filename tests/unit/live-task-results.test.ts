import { describe, expect, it } from "vitest";
import { publishedAverage, visibleResultReviews } from "@/lib/public-results-grade";
import { draftFromWork, type ReviewWork } from "@/lib/review-workspace";

describe("live task results", () => {
 it("publishes only completed reviews and excludes draft comments", () => {
  const reviews = [{ status: "COMPLETED", totalPoints: 80, feedback: "Visible" }, { status: "IN_PROGRESS", totalPoints: 20, feedback: "Private" }];
  const visible = visibleResultReviews(reviews, true);
  expect(visible.map(review => review.feedback)).toEqual(["Visible"]);
  expect(publishedAverage(visible, 100)).toBe(80);
  expect(publishedAverage(visibleResultReviews(reviews, false), 100)).toBeNull();
 });
 it("does not publish a work that has no completed review and preserves an explicit zero", () => {
  expect(publishedAverage(visibleResultReviews([{ status: "PENDING", totalPoints: null }], true), 100)).toBeNull();
  expect(publishedAverage(visibleResultReviews([{ status: "COMPLETED", totalPoints: 0 }], true), 100)).toBe(0);
 });
 it("allows ongoing edits of live published reviews while keeping legacy locks and permissions", () => {
  const work: ReviewWork = { id: "review", canEdit: true, status: "COMPLETED", totalPoints: 80, feedback: null, evaluator: { name: "Evaluator" }, scores: [], submission: { resultsPublishedAt: "2026-10-27T12:00:00Z", content: null, attachments: [], task: { id: "task", title: "Task", resultsPublishedAt: "2026-10-27T12:00:00Z", description: null, instructions: null, maxPoints: 100, criteria: [] } } };
  expect(draftFromWork(work).readOnly).toBe(false);
  expect(draftFromWork({ ...work, canEdit: false }).readOnly).toBe(true);
  expect(draftFromWork({ ...work, submission: { ...work.submission, task: { ...work.submission.task, resultsPublishedAt: null } } }).readOnly).toBe(true);
 });
});
