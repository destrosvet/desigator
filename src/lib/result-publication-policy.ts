export type PublicationReview = { status: string; totalPoints: number | null };
export function resultPublicationBlock(stage: string, reviews: PublicationReview[], maxPoints: number): "notFinal" | "noReviews" | "incomplete" | null {
 if (stage !== "FINAL") return "notFinal";
 if (!reviews.length) return "noReviews";
 if (reviews.some(review => review.status !== "COMPLETED" || review.totalPoints === null || !Number.isInteger(review.totalPoints) || review.totalPoints < 0 || review.totalPoints > maxPoints)) return "incomplete";
 return null;
}
