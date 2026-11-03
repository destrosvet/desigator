import { describe, expect, it } from "vitest";
import { draftFromWork, draftScores, isFullyRated, relativeReviewDraft, type ReviewWork } from "@/lib/review-workspace";

const work: ReviewWork = {
  id: "review", status: "PENDING", totalPoints: null, feedback: null, evaluator: { name: "Reviewer" }, scores: [],
  submission: { content: null, attachments: [], task: { id: "task", title: "Poster", description: null, instructions: null, maxPoints: 100, criteria: [{ id: "composition", name: "Composition", description: null, maxPoints: 60 }, { id: "craft", name: "Craft", description: null, maxPoints: 40 }] } },
};

describe("rapid review drafts", () => {
  it("copies points and adjusts the total by exactly one without copying feedback", () => {
    const current = draftFromWork(work);
    const previous = { ...draftFromWork(work), touched: ["composition", "craft"], scores: { composition: { points: 60, comment: "Previous" }, craft: { points: 30, comment: "" } } };
    const higher = relativeReviewDraft(current, previous, 1)!;
    expect(higher.scores).toEqual({ composition: { points: 60, comment: "" }, craft: { points: 31, comment: "" } });
    expect(isFullyRated(higher)).toBe(true);
    expect(relativeReviewDraft(current, previous, -1)!.scores.composition.points).toBe(59);
    expect(current.touched).toEqual([]);
  });

  it("rejects incomplete references, read-only work, incompatible criteria and out-of-range totals", () => {
    const current = draftFromWork(work);
    const zero = { ...current, touched: ["composition", "craft"], scores: { composition: { points: 0, comment: "" }, craft: { points: 0, comment: "" } } };
    expect(relativeReviewDraft(current, current, 1)).toBeNull();
    expect(relativeReviewDraft({ ...current, readOnly: true }, zero, 1)).toBeNull();
    expect(relativeReviewDraft(current, { ...zero, limits: { other: 100 } }, 1)).toBeNull();
    expect(relativeReviewDraft(current, zero, -1)).toBeNull();
    const maximum = { ...zero, scores: { composition: { points: 60, comment: "" }, craft: { points: 40, comment: "" } } };
    expect(relativeReviewDraft(current, maximum, 1)).toBeNull();
    expect(relativeReviewDraft(current, maximum, -1)!.scores.composition.points).toBe(59);
  });
  it("starts untouched sliders at half of their maximum without treating them as assessed", () => {
    const draft = draftFromWork(work);
    expect(draft.scores.composition.points).toBe(30);
    expect(draft.scores.craft.points).toBe(20);
    expect(isFullyRated(draft)).toBe(false);
    expect(draftScores(draft)).toEqual([]);
  });

  it("preserves an explicitly awarded zero while leaving other criteria unassessed", () => {
    const draft = draftFromWork({ ...work, scores: [{ criterionId: "composition", points: 0, comment: "Missing composition" }] });
    expect(isFullyRated(draft)).toBe(false);
    expect(draftScores(draft)).toEqual([{ criterionId: "composition", points: 0, comment: "Missing composition" }]);
  });

  it("can complete a review with all criteria explicitly rated zero", () => {
    const draft = draftFromWork({ ...work, scores: [{ criterionId: "composition", points: 0, comment: null }, { criterionId: "craft", points: 0, comment: null }] });
    expect(isFullyRated(draft)).toBe(true);
    expect(draftScores(draft)).toHaveLength(2);
  });
});
