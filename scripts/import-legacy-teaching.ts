import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { parseLegacySql } from "../src/lib/legacy-sql";
const db=new PrismaClient();
const arg=(key:string)=>{const i=process.argv.indexOf(key);return i<0?undefined:process.argv[i+1];};
async function main(){
 const organizationId=arg("--organization-id"),teacherEmail=arg("--teacher-email");
 if(!organizationId||!teacherEmail)throw new Error("Specify school and teacher explicitly");
 const source=readFileSync(arg("--file")||"db/desigator-export.sql","utf8");
 const data=parseLegacySql(source),sourceHash=createHash("sha256").update(source).digest("hex");
 const archive=await db.historicalImport.findUniqueOrThrow({where:{organizationId_sourceHash:{organizationId,sourceHash}}});
 const teacher=await db.user.findUniqueOrThrow({where:{email:teacherEmail}});
 if(teacher.organizationId!==organizationId||!teacher.isActive||!(teacher.role==='TEACHER'||teacher.roles.includes('TEACHER')))throw new Error("Teacher must be active and belong to target school");
 const courses=await db.historicalCourse.findMany({where:{importId:archive.id}});
 const tasks=await db.historicalTask.findMany({where:{importId:archive.id}});
 const rawTasks=new Map(data.dg_task.map(r=>[Number(r.task_id),r]));
 const orphaned=tasks.filter(t=>!t.courseId);
 const result=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId} FOR UPDATE`;
  const before={subjects:await tx.subject.count({where:{id:{startsWith:archive.id+'-subject-'}}}),tasks:await tx.task.count({where:{id:{startsWith:archive.id+'-task-'}}})};
  if(!process.argv.includes('--apply'))return {dryRun:true,courses:courses.length,tasks:tasks.length,orphanedTasks:orphaned.length,existing:before};
  const entries=[...courses.map(c=>({key:String(c.legacyId),code:c.code,name:c.name,year:c.year||0,semester:c.semester as 'SUMMER'|'WINTER'})),...(orphaned.length?[{key:'unassigned',code:'ARCHIV',name:'Archiv — zadání bez dohledaného předmětu',year:0,semester:'FULL_YEAR' as const}]:[])];
  for(const c of entries){
   const classId=archive.id+'-class-'+c.key,subjectId=archive.id+'-subject-'+c.key;
   await tx.class.upsert({where:{id:classId},update:{},create:{id:classId,organizationId,teacherId:teacher.id,name:'Archiv: '+c.code+' '+(c.year||'rok neznámý'),code:classId,description:'Historická skupina z původního systému.',isActive:false}});
   await tx.subject.upsert({where:{id:subjectId},update:{},create:{id:subjectId,classId,teacherId:teacher.id,code:c.code,name:c.name,year:c.year,semester:c.semester,description:'Importovaný historický předmět. '+(!c.year?'Rok není ve zdroji znám; hodnota 0 znamená neznámý rok.':''),isActive:false}});
   await tx.subjectClass.upsert({where:{subjectId_classId:{subjectId,classId}},update:{},create:{subjectId,classId}});
  }
  const courseKeys=new Map(courses.map(c=>[c.id,String(c.legacyId)]));
  for(const t of tasks){
   const r=rawTasks.get(t.legacyId);
   await tx.task.upsert({where:{id:archive.id+'-task-'+t.legacyId},update:{},create:{id:archive.id+'-task-'+t.legacyId,legacyId:t.legacyId,subjectId:archive.id+'-subject-'+(t.courseId?courseKeys.get(t.courseId):'unassigned'),creatorId:teacher.id,title:t.title,description:r?.task_description||null,instructions:r?.task_condition||null,maxPoints:t.maxPoints??0,status:'CLOSED'}});
  }
  const students=await tx.user.findMany({where:{organizationId,role:'STUDENT',id:{startsWith:archive.id+'-student-'}},select:{id:true,legacyId:true}});
  const studentIds=new Map(students.map(s=>[s.legacyId,s.id]));
  const validCourses=new Set(courses.map(c=>String(c.legacyId)));
  const memberships=new Map<string,{classId:string;studentId:string}>();
  for(const r of data.dg_user_course||[]){const studentId=studentIds.get(Number(r.id_user));if(studentId&&validCourses.has(r.id_course||'')){const classId=archive.id+'-class-'+r.id_course;memberships.set(classId+':'+studentId,{classId,studentId});}}
  // Preserve membership for rated students even if the old registration row is absent.
  const taskCourses=new Map(tasks.map(t=>[t.legacyId,t.courseId?courseKeys.get(t.courseId):'unassigned']));
  for(const r of data.dg_mark){const studentId=studentIds.get(Number(r.id_user)),key=taskCourses.get(Number(r.id_task));if(studentId&&key){const classId=archive.id+'-class-'+key;memberships.set(classId+':'+studentId,{classId,studentId});}}
  await tx.classStudent.createMany({data:[...memberships.values()],skipDuplicates:true});
  await tx.historicalCourse.updateMany({where:{importId:archive.id},data:{teacherId:teacher.id}});
  return {subjects:entries.length,originalCourses:courses.length,tasks:tasks.length,orphanedTasks:orphaned.length,memberships:memberships.size,newSubjects:entries.length-before.subjects,newTasks:tasks.length-before.tasks};
 },{timeout:60000});
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
