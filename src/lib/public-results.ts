import {adjustedTotal} from "@/lib/result-adjustments";
import {parseGradingScale} from "@/lib/grading-scale";
import { db } from "@/lib/db";
import { finalGrade, publishedAverage } from "@/lib/public-results-grade";
export const publicImageTypes = ["image/jpeg","image/png","image/webp","image/gif"];
// Shared classes are deliberately never enumerated anonymously.
export async function publicClasses() { return []; }
export async function publicResults(shareToken: string, subjectId?: string) {
 if(!/^[a-f0-9]{64}$/.test(shareToken)) return null;
 const classroom=await db.class.findFirst({where:{resultsShare:{is:{token:shareToken}},isActive:true,publicResultsEnabled:true},select:{id:true,name:true,organizationId:true,organization:{select:{gradingScale:true}},subjectLinks:{where:{subject:{isActive:true}},select:{subject:{select:{id:true,name:true,year:true}}}}}});
 if(!classroom) return null;
 const classId=classroom.id;
 const subjects=classroom.subjectLinks.map(link=>link.subject).sort((a,b)=>b.year-a.year||a.name.localeCompare(b.name));
 const subject=subjectId ? subjects.find(s=>s.id===subjectId) : subjects[0];
 if(subjectId && !subject) return null;
 const [members,tasks,adjustments]=await Promise.all([
 db.classStudent.findMany({where:{classId,student:{isActive:true,organizationId:classroom.organizationId,externalId:{not:null}}},select:{student:{select:{id:true,externalId:true}}}}),
 subject ? db.task.findMany({where:{subjectId:subject.id,isTemplate:false,status:{in:["PUBLISHED","CLOSED"]}},select:{id:true,title:true,maxPoints:true,submissions:{where:{stage:"FINAL",resultsPublishedAt:{not:null}},orderBy:{version:"desc"},select:{studentId:true,evaluations:{select:{status:true,totalPoints:true,feedback:true,scores:{select:{comment:true,criterion:{select:{name:true}}}}}},attachments:{where:{mimeType:{in:publicImageTypes}},select:{id:true}}}}},orderBy:[{createdAt:"asc"},{id:"asc"}]}) : Promise.resolve([]),
 subject?db.pointAdjustment.findMany({where:{subjectId:subject.id,revokedAt:null},select:{studentId:true,amountCents:true}}):Promise.resolve([])
 ]);
 const gradingScale=parseGradingScale(classroom.organization?.gradingScale);
 const maximum=tasks.reduce((sum,t)=>sum+t.maxPoints,0);
 const rows=members.filter(m=>m.student.externalId?.trim()).map(({student})=>{
 const cells=tasks.map(task=>{const work=task.submissions.find(s=>s.studentId===student.id);const points=work ? publishedAverage(work.evaluations,task.maxPoints) : null;const comments=points===null?[]:work!.evaluations.flatMap(review=>[...(review.feedback?.trim()?[{text:review.feedback.trim(),criterion:null as string|null}]:[]),...(review.scores??[]).filter(score=>score.comment?.trim()).map(score=>({text:score.comment!.trim(),criterion:score.criterion.name}))]);return {comments,points:points===null?null:Math.round(points*100)/100,raw:points,images:points===null?[]:work!.attachments.map(a=>({id:a.id,url:"/api/public/results/"+shareToken+"/preview/"+a.id}))};});
 const base=Math.round(cells.reduce((sum,c)=>sum+(c.raw??0),0)*100)/100;
 const ownAdjustments=adjustments.filter(a=>a.studentId===student.id);const total=adjustedTotal(base,ownAdjustments);
 return {studentId:student.externalId!,cells:cells.map(({points,images,comments})=>({points,images,comments})),total,grade:finalGrade(total,maximum,gradingScale),provisional:cells.some(c=>c.points===null)};
 }).sort((a,b)=>a.studentId.localeCompare(b.studentId,undefined,{numeric:true}));
 return {id:classroom.id,name:classroom.name,subjects,subject:subject??null,tasks:tasks.map(({id,title,maxPoints})=>({id,title,maxPoints})),maximum,gradingScale,rows};
}
