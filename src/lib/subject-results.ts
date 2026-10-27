import {db} from "@/lib/db";
import {canManageSubject,managedSubjectScope,type AuthUser} from "@/lib/authorization";
import {hasRole,schoolId} from "@/lib/permissions";
import {parseGradingScale} from "@/lib/grading-scale";
import {publishedAverage,finalGrade,visibleResultReviews} from "@/lib/public-results-grade";
import {adjustedTotal,gradeDistance,studentVisibleAdjustments} from "@/lib/result-adjustments";
export async function subjectResults(user:AuthUser,id:string){
 const teacher=await canManageSubject(user,id);
 if(!teacher&&!hasRole(user,"STUDENT"))return null;
 const subject=await db.subject.findFirst({where:{id,isActive:true,AND:[{classes:{some:{class:{isActive:true}}}},teacher?managedSubjectScope(user):{classes:{some:{class:{organizationId:schoolId(user),students:{some:{studentId:user.id}}}}}}]},select:{id:true,name:true,year:true,classes:{select:{classId:true,class:{select:{name:true,organizationId:true,organization:{select:{gradingScale:true}}}}},orderBy:{class:{name:"asc"}}}}});
 if(!subject||!subject.classes.length)return null;
 const classIds=subject.classes.map(link=>link.classId),organizationId=subject.classes[0].class.organizationId;
 const [memberships,tasks,adjustments]=await Promise.all([
 db.classStudent.findMany({where:{classId:{in:classIds},...(!teacher?{studentId:user.id}:{}),student:{isActive:true,organizationId}},select:{student:{select:{id:true,name:true,externalId:true}}},orderBy:{student:{name:"asc"}}}),
 db.task.findMany({where:{subjectId:id,status:{in:["PUBLISHED","CLOSED"]},isTemplate:false},select:{id:true,title:true,maxPoints:true,resultsPublishedAt:true,submissions:{where:{stage:"FINAL",...(!teacher?{studentId:user.id,OR:[{resultsPublishedAt:{not:null}},{task:{resultsPublishedAt:{not:null}}}]}:{})},orderBy:{version:"desc"},select:{studentId:true,resultsPublishedAt:true,evaluations:{select:{status:true,totalPoints:true}}}}},orderBy:[{createdAt:"asc"},{id:"asc"}]}),
 db.pointAdjustment.findMany({where:{subjectId:id,...(!teacher?{studentId:user.id}:{})},include:{author:{select:{name:true}},revokedBy:{select:{name:true}}},orderBy:{createdAt:"desc"}})
 ]);
 const members=[...new Map(memberships.map(item=>[item.student.id,item])).values()];
 const scale=parseGradingScale(subject.classes[0].class.organization.gradingScale),maximum=tasks.reduce((sum,t)=>sum+t.maxPoints,0);
 const rows=members.map(({student})=>{
 const own=adjustments.filter(a=>a.studentId===student.id),active=own.filter(a=>!a.revokedAt);
 const cells=tasks.map(task=>{const work=task.submissions.find(s=>s.studentId===student.id);return {points:work?publishedAverage(visibleResultReviews(work.evaluations,Boolean(task.resultsPublishedAt)),task.maxPoints):null,pending:Boolean(task.resultsPublishedAt&&work?.evaluations.some(review=>review.status!=="COMPLETED")),published:Boolean(work&&(work.resultsPublishedAt||task.resultsPublishedAt))};});
 const base=Math.round(cells.reduce((sum,c)=>sum+(c.points??0),0)*100)/100,total=adjustedTotal(base,active),grade=finalGrade(total,maximum,scale);
 const publicBase=Math.round(tasks.reduce((sum,task)=>{const work=task.submissions.find(s=>s.studentId===student.id&&(s.resultsPublishedAt||task.resultsPublishedAt));return sum+(work?publishedAverage(visibleResultReviews(work.evaluations,Boolean(task.resultsPublishedAt)),task.maxPoints)??0:0);},0)*100)/100;
 const common={studentId:student.id,name:student.name,externalId:student.externalId,cells:cells.map(c=>({points:c.points===null?null:Math.round(c.points*100)/100,published:c.published})),total,grade,provisional:cells.some(c=>c.points===null||c.pending),visibleAdjustments:studentVisibleAdjustments(own)};
 return {...common,...(teacher?{base,adjustmentPoints:active.reduce((sum,a)=>sum+a.amountCents,0)/100,distance:gradeDistance(total,maximum,scale),publishedTotal:adjustedTotal(publicBase,active),adjustments:own.map(a=>({id:a.id,points:a.amountCents/100,reason:a.reason,visibleToStudent:a.visibleToStudent,author:a.author.name,createdAt:a.createdAt.toISOString(),revokedAt:a.revokedAt?.toISOString()??null,revokedBy:a.revokedBy?.name??null}))}: {})};
 });
 return {mode:teacher?"teacher" as const:"student" as const,id:subject.id,name:subject.name,year:subject.year,className:subject.classes.map(link=>link.class.name).join(", "),maximum,scale,tasks:tasks.map(({id,title,maxPoints})=>({id,title,maxPoints})),rows};
}