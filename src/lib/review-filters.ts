import type { ReviewQueueItem } from "@/lib/review-workspace";

export type ReviewFilters = {
 page?: number; limit?: number; search?: string; status?: string;
 taskId?: string; subjectId?: string; studentId?: string; evaluatorId?: string;
};

// Whitelist filter fields; no caller-supplied return URL is used for navigation.
export function reviewFilterQuery(filters: ReviewFilters) {
 const query = new URLSearchParams();
 for (const key of ["taskId", "subjectId", "status", "search", "studentId", "evaluatorId", "page", "limit"] as const) {
  const value = filters[key];
  if (value !== undefined && value !== "") query.set(key, String(value));
 }
 return query.toString();
}

export function matchingReviewQueue(queue: ReviewQueueItem[], currentId: string, status?: string) {
 return queue.filter(item => item.id === currentId || !status || item.status === status);
}
