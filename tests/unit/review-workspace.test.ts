import { describe, expect, it } from "vitest";
import { draftFromWork, draftScores, isFullyRated, type ReviewWork } from "@/lib/review-workspace";

const work: ReviewWork = {
  id: "review", status: "PENDING", totalPoints: null, feedback: null, evaluator: { name: "Reviewer" }, scores: [],
  submission: { content: null, student: { name: "Student", email: "student@example.cz" }, attachments: [], task: { id: "task", title: "Poster", description: null, instructions: null, maxPoints: 100, criteria: [{ id: "composition", name: "Composition", description: null, maxPoints: 60 }, { id: "craft", name: "Craft", description: null, maxPoints: 40 }] } },
};

describe("rapid review drafts", () => {
  it("does not treat the initial zero position of a slider as an assessment", () => {
    const draft = draftFromWork(work);
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
