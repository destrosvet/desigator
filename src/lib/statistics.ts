import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { managedSubjectScope, type AuthUser } from "@/lib/authorization";
import { canTeach, isAdmin, isSchoolAdmin, schoolId } from "@/lib/permissions";
import { summarizeRatings, type StatisticRating } from "@/lib/statistics-summary";
export const statisticsQuery = z.object({source:z.enum(["all","current","historical"]).default("all"),year:z.coerce.number().int().min(1900).max(2200).optional(),organizationId:z.string().min(1).optional(),subjectId:z.string().min(1).optional()}).strict();
export function historicalCourseScope(user: AuthUser): Prisma.HistoricalCourseWhereInput {
 if(isAdmin(user))return {};
 if(!canTeach(user))return {id:{in:[]}};
 return {import:{organizationId:schoolId(user)},...(isSchoolAdmin(user)?{}:{teacherId:user.id})};
}
export async function getStatistics(user: AuthUser, query: z.infer<typeof statisticsQuery>) {
 const organizationScope = isAdmin(user)?{}:{id:schoolId(user)};
 const [organizations,subjects,courses] = await Promise.all([
  db.organization.findMany({where:organizationScope,select:{id:true,name:true},orderBy:{name:'asc'}}),
  db.subject.findMany({where:{AND:[managedSubjectScope(user),...(query.organizationId?[{classes:{some:{class:{organizationId:query.organizationId}}}}]:[])]},select:{id:true,name:true,code:true,year:true,teacherId:true,class:{select:{organizationId:true,organization:{select:{name:true}}}}},orderBy:[{year:'desc'},{name:'asc'}]}),
  db.historicalCourse.findMany({where:{AND:[historicalCourseScope(user),...(query.organizationId?[{import:{organizationId:query.organizationId}}]:[])]},select:{id:true,name:true,code:true,year:true,teacherId:true,teacher:{select:{name:true}},import:{select:{organizationId:true,organization:{select:{name:true}}}}},orderBy:[{year:'desc'},{name:'asc'}]})
 ]);
 const selectedOrganizationIds=organizations.filter(o=>!query.organizationId||o.id===query.organizationId).map(o=>o.id);
 const selectedSubjects=subjects.filter(s=>(!query.subjectId||query.subjectId==='current:'+s.id)&&(!query.year||s.year===query.year));
 const selectedCourses=courses.filter(s=>(!query.subjectId||query.subjectId==='historical:'+s.id)&&(!query.year||s.year===query.year));
 const rows: StatisticRating[]=[];
 if(query.source!=='historical'&&selectedSubjects.length) {
  // A work is counted once: completed ratings of the latest FINAL version only. WIP is not a new final result.
  const latest=await db.submission.findMany({where:{stage:'FINAL',task:{subjectId:{in:selectedSubjects.map(s=>s.id)}}},orderBy:{version:'desc'},distinct:['taskId','studentId'],select:{id:true}});
  const ratings=await db.evaluation.findMany({where:{status:'COMPLETED',totalPoints:{not:null},submissionId:{in:latest.map(r=>r.id)}},select:{id:true,evaluatorId:true,totalPoints:true,evaluator:{select:{name:true}},submission:{select:{id:true,studentId:true,task:{select:{maxPoints:true,subjectId:true}}}}}});
  const map=new Map(subjects.map(s=>[s.id,s]));
  for(const r of ratings){const s=map.get(r.submission.task.subjectId)!;rows.push({id:r.id,source:'current',workId:'current:'+r.submission.id,studentId:'current:'+r.submission.studentId,evaluatorId:'current:'+r.evaluatorId,evaluatorName:r.evaluator.name,subjectId:'current:'+s.id,subjectName:(s.code?s.code+' · ':'')+s.name+' · '+s.year,year:s.year,organizationId:s.class.organizationId,organizationName:s.class.organization.name,points:r.totalPoints!,maxPoints:r.submission.task.maxPoints});}
 }
 if(query.source!=='current') {
  // Unmapped courses belong only to the school/platform overview, never implicitly to a teacher.
  const allowUnmapped=(isAdmin(user)||isSchoolAdmin(user))&&!query.subjectId&&!query.year;
  const archiveWhere: Prisma.HistoricalTaskWhereInput = {AND:[{import:{organizationId:{in:selectedOrganizationIds}}},{OR:[{courseId:{in:selectedCourses.map(c=>c.id)}},...(allowUnmapped?[{courseId:null}]:[])]}]};
  const ratings=await db.historicalRating.findMany({where:{task:archiveWhere},select:{id:true,taskId:true,studentLegacyId:true,evaluatorLegacyId:true,evaluatorName:true,points:true,task:{select:{importId:true,courseId:true,maxPoints:true,import:{select:{organizationId:true,organization:{select:{name:true}}}}}}}});
  const map=new Map(courses.map(c=>[c.id,c]));
  for(const r of ratings){const s=r.task.courseId?map.get(r.task.courseId):undefined;rows.push({id:r.id,source:'historical',workId:'historical:'+r.taskId+':'+r.studentLegacyId,studentId:r.task.importId+':'+r.studentLegacyId,evaluatorId:r.task.importId+':'+r.evaluatorLegacyId,evaluatorName:r.evaluatorName,subjectId:s?'historical:'+s.id:'unmapped:'+r.task.importId,subjectName:s?(s.code?s.code+' · ':'')+s.name+' · '+(s.year??'rok neuveden'):'Bez dohledaného předmětu',year:s?.year??null,organizationId:r.task.import.organizationId,organizationName:r.task.import.organization.name,points:r.points,maxPoints:r.task.maxPoints});}
 }
 const imports = isAdmin(user)||isSchoolAdmin(user) ? await db.historicalImport.findMany({where:{organizationId:{in:selectedOrganizationIds}},select:{id:true,sourceName:true,createdAt:true,report:true}}) : [];
 const owners: {id:string;name:string;organizationId:string|null}[] = [];
 return {summary:summarizeRatings(rows),options:{organizations:organizations.filter(o=>o.id===query.organizationId),subjects:[...subjects.filter(s=>query.subjectId==='current:'+s.id).map(s=>({id:'current:'+s.id,name:(s.code?s.code+' · ':'')+s.name+' · '+s.year,year:s.year,source:'current'})),...courses.filter(s=>query.subjectId==='historical:'+s.id).map(s=>({id:'historical:'+s.id,name:(s.code?s.code+' · ':'')+s.name+' · '+(s.year??'rok neuveden')+' (archiv)',year:s.year,source:'historical'}))],years:[...new Set([...subjects.map(s=>s.year),...courses.map(s=>s.year)].filter((y):y is number=>y!==null))].sort((a,b)=>b-a)},imports,
  archiveCourses:courses.map(c=>({id:c.id,name:c.name,code:c.code,year:c.year,teacherId:c.teacherId,teacherName:c.teacher?.name??null,organizationId:c.import.organizationId})),owners,canAssign:isAdmin(user)||isSchoolAdmin(user),scope:isAdmin(user)?'platform':isSchoolAdmin(user)?'school':'teacher'};
}
