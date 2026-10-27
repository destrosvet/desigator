import type { WorkAttachment } from "@/lib/media";

export type ReviewWork = {
  id: string; status: string; totalPoints: number | null; feedback: string | null;
  evaluator: { name: string };
  scores: Array<{ criterionId: string; points: number; comment: string | null }>;
  submission: {
    version?: number; stage?: string; resultsPublishedAt?: string | null;
    content: string | null;
    attachments: WorkAttachment[];
    task: { id: string; title: string; description: string | null; instructions: string | null; maxPoints: number;
      criteria: Array<{ id: string; name: string; description: string | null; maxPoints: number }>;
    };
  };
};

export type ReviewQueueItem = { id: string; status: string; totalPoints: number | null };

export type ReviewDraft = {
  readOnly: boolean;
  id: string; feedback: string; status: string; revision: number; savedRevision: number;
  touched: string[]; scores: Record<string, { points: number; comment: string }>;
  limits: Record<string, number>; maxPoints: number;
};

export function draftFromWork(work: ReviewWork): ReviewDraft {
  const scores = new Map(work.scores.map((score) => [score.criterionId, score]));
  return {
    readOnly: Boolean(work.submission.resultsPublishedAt),
    id: work.id, feedback: work.feedback || "", status: work.status, revision: 0, savedRevision: 0,
    touched: work.scores.map((score) => score.criterionId), maxPoints: work.submission.task.maxPoints,
    limits: Object.fromEntries(work.submission.task.criteria.map((criterion) => [criterion.id, criterion.maxPoints])),
    scores: Object.fromEntries(work.submission.task.criteria.map((criterion) => [criterion.id, { points: scores.get(criterion.id)?.points ?? Math.round(criterion.maxPoints / 2), comment: scores.get(criterion.id)?.comment || "" }])),
  };
}

export function isFullyRated(draft: ReviewDraft) {
  const ids = Object.keys(draft.limits);
  return ids.length > 0 && ids.every((id) => draft.touched.includes(id));
}

export function draftScores(draft: ReviewDraft) {
  return draft.touched.filter((id) => id in draft.limits).map((criterionId) => ({ criterionId, points: draft.scores[criterionId].points, comment: draft.scores[criterionId].comment || null }));
}
