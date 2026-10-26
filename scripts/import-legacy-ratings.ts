import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { parseLegacySql } from "../src/lib/legacy-sql";
const db = new PrismaClient();
const arg = (key: string) => { const i = process.argv.indexOf(key); return i >= 0 ? process.argv[i + 1] : undefined; };
async function main() {
 const organizationId = arg("--organization-id");
 if (!organizationId) throw new Error("Specify --organization-id. Import never guesses the school.");
 const source = readFileSync(arg("--file") || "db/desigator-export.sql", "utf8");
 const data = parseLegacySql(source);
 const sourceName = arg("--source-name") || "desigator-export.sql";
 const sourceHash = createHash("sha256").update(source).digest("hex");
 const prefix = "hist-" + createHash("sha256").update(organizationId + sourceHash).digest("hex").slice(0,24);
 const users = new Map(data.dg_user.map(r => [r.user_id!, r.user_name || "Neznámý"]));
 const courses = new Map(data.dg_course.map(r => [r.course_id!, r]));
 const taskRows = new Map(data.dg_task.map(r => [r.task_id!, r]));
 const links = new Map<string,string>();
 for (const r of data.dg_course_task) { if (links.has(r.id_task!) && links.get(r.id_task!) !== r.id_course) throw new Error("Ambiguous historical task/course mapping"); links.set(r.id_task!,r.id_course!); }
 const missingTaskIds = [...new Set(data.dg_mark.filter(r=>!taskRows.has(r.id_task!)).map(r=>r.id_task!))];
 const report = { users: users.size, courses: courses.size, tasks: taskRows.size, ratings: data.dg_mark.length,
   coursesWithoutYear: data.dg_course.filter(r=>!Number(r.course_year)).length,
   tasksWithoutCourse: data.dg_task.filter(r=>!courses.has(links.get(r.task_id!) || "")).length,
   missingTaskIds, unknownStudents: data.dg_mark.filter(r=>!users.has(r.id_user!)).length, unknownEvaluators: data.dg_mark.filter(r=>!users.has(r.id_judge!)).length,
   scoresOutsideScale: data.dg_mark.filter(r=> {const max=Number(taskRows.get(r.id_task!)?.task_points);return max>0 && (Number(r.mark)<0 || Number(r.mark)>max);}).length };
 console.log(JSON.stringify(report,null,2));
 if (!process.argv.includes("--apply")) { console.log("Dry run. Pass --apply to write the archive."); return; }
 const school = await db.organization.findUnique({where:{id:organizationId},select:{id:true}}); if(!school)throw new Error("Target organization does not exist");
 const result = await db.$transaction(async tx=> {
   await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId} FOR UPDATE`;
   const existing = await tx.historicalImport.findUnique({where:{organizationId_sourceHash:{organizationId,sourceHash}}});
   if(existing) return { alreadyImported:true, importId:existing.id };
   if(await tx.historicalImport.findFirst({where:{organizationId,sourceName}})) throw new Error("Tento zdroj už byl importován s jiným obsahem. Aktualizaci archivu je nutné vyřešit samostatně.");
   await tx.historicalImport.create({data:{id:prefix,organizationId,sourceHash,sourceName,report: report as Prisma.InputJsonValue}});
   await tx.historicalCourse.createMany({data:data.dg_course.map(r=>({id:prefix+"-c"+r.course_id,importId:prefix,legacyId:Number(r.course_id),code:r.course_name || "",name:r.course_description || r.course_name || "Neznámý předmět",year:Number(r.course_year)||null,semester:r.course_semester==='1'?'SUMMER':'WINTER'}))});
   const tasks = [...data.dg_task, ...missingTaskIds.map(id=>({task_id:id,task_name:"Nedohledané zadání #"+id,task_points:null}))];
   await tx.historicalTask.createMany({data:tasks.map(r=>({id:prefix+"-t"+r.task_id,importId:prefix,legacyId:Number(r.task_id),courseId:courses.has(links.get(r.task_id!) || "")?prefix+"-c"+links.get(r.task_id!):null,title:r.task_name||"Neznámé zadání",maxPoints:r.task_points===null?null:Number(r.task_points)}))});
   for(let offset=0;offset<data.dg_mark.length;offset+=500) await tx.historicalRating.createMany({data:data.dg_mark.slice(offset,offset+500).map(r=>({id:prefix+"-r"+r.id_task+"-"+r.id_user+"-"+r.id_judge,taskId:prefix+"-t"+r.id_task,studentLegacyId:Number(r.id_user),evaluatorLegacyId:Number(r.id_judge),studentName:users.get(r.id_user!)||"Nedohledaný student #"+r.id_user,evaluatorName:users.get(r.id_judge!)||"Nedohledaný hodnotitel #"+r.id_judge,points:Number(r.mark),feedback:r.description||"",sourceDate:r.date||""}))});
   return {alreadyImported:false,importId:prefix};
 },{timeout:60000});
 console.log(JSON.stringify(result));
 console.log(JSON.stringify({storedRatings:await db.historicalRating.count({where:{task:{importId:result.importId}}})}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.$disconnect());
