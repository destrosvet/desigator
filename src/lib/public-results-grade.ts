import {defaultGradingScale,gradeLabels,type GradingScale} from "@/lib/grading-scale";
// ECTS defaults follow VUT's point conversion; schools can configure their own scale.
export function finalGrade(points:number,maximum:number,scale:GradingScale=defaultGradingScale):string|null{
 if(maximum<=0)return null;
 const labels=gradeLabels(scale),cents=Math.round(points*100);
 const index=scale.thresholds.findIndex(boundary=>cents>=maximum*boundary);
 return labels[index<0?labels.length-1:index];
}
export function publishedAverage(reviews:{status:string;totalPoints:number|null}[],maximum:number):number|null{
 if(!reviews.length||reviews.some(r=>r.status!=="COMPLETED"||r.totalPoints===null||!Number.isInteger(r.totalPoints)||r.totalPoints<0||r.totalPoints>maximum))return null;
 return reviews.reduce((sum,r)=>sum+r.totalPoints!,0)/reviews.length;
}

// Live tasks expose only completed reviews; drafts and their comments stay private.
export function visibleResultReviews<T extends { status: string }>(reviews: T[], live: boolean): T[] {
 return live ? reviews.filter(review => review.status === "COMPLETED") : reviews;
}
