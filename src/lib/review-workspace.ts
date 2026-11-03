import type { WorkAttachment } from "@/lib/media";

export type ReviewWork = {
  canEdit?: boolean;
  id: string; status: string; totalPoints: number | null; feedback: string | null;
  evaluator: { name: string };
  scores: Array<{ criterionId: string; points: number; comment: string | null }>;
  submission: {
    version?: number; stage?: string; resultsPublishedAt?: string | null;
    content: string | null;
    student?: { name: string; email: string };
    attachments: WorkAttachment[];
    task: { resultsPublishedAt?: string | null; id: string; title: string; description: string | null; instructions: string | null; maxPoints: number;
      criteria: Array<{ id: string; name: string; description: string | null; maxPoints: number }>;
    };
  };
};

export type ReviewQueueItem = { id: string; status: string; totalPoints: number | null; submission?: { student: { name: string } } };

export type ReviewDraft = {
  readOnly: boolean;
  id: string; feedback: string; status: string; revision: number; savedRevision: number;
  touched: string[]; scores: Record<string, { points: number; comment: string }>;
  limits: Record<string, number>; maxPoints: number;
};

export function draftFromWork(work: ReviewWork): ReviewDraft {
  const scores = new Map(work.scores.map((score) => [score.criterionId, score]));
  return {
    readOnly: (Boolean(work.submission.resultsPublishedAt) && !work.submission.task.resultsPublishedAt) || work.canEdit === false,
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

export function relativeReviewDraft(current: ReviewDraft, previous: ReviewDraft, direction: 1 | -1): ReviewDraft | null {
  const ids = Object.keys(current.limits);
  if (current.readOnly || !isFullyRated(previous) || ids.length !== Object.keys(previous.limits).length || ids.some((id) => current.limits[id] !== previous.limits[id])) return null;
  const total = ids.reduce((sum, id) => sum + previous.scores[id].points, 0);
  const target = total + direction;
  if (!Number.isInteger(total) || target < 0 || target > current.maxPoints || ids.some((id) => previous.scores[id].points < 0 || previous.scores[id].points > current.limits[id])) return null;
  const adjusted = ids.find((id) => direction === 1 ? previous.scores[id].points < current.limits[id] : previous.scores[id].points > 0);
  if (!adjusted) return null;
  return { ...current, touched: ids, scores: Object.fromEntries(ids.map((id) => [id, { ...current.scores[id], points: previous.scores[id].points + (id === adjusted ? direction : 0) }])) };
}
