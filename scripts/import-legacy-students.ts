import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { parseLegacySql } from "../src/lib/legacy-sql";
const db = new PrismaClient();
const arg = (key: string) => { const i = process.argv.indexOf(key); return i >= 0 ? process.argv[i + 1] : undefined; };
async function main() {
 const organizationId = arg("--organization-id");
 if (!organizationId) throw new Error("Specify --organization-id");
 const source = readFileSync(arg("--file") || "db/desigator-export.sql", "utf8");
 const sourceHash = createHash("sha256").update(source).digest("hex");
 const data = parseLegacySql(source);
 const students = data.dg_user.filter(r => r.user_role === "2");
 const archive = await db.historicalImport.findUnique({where:{organizationId_sourceHash:{organizationId,sourceHash}}});
 if (!archive) throw new Error("Import this exact ratings archive into the target school first.");
 const prefix = archive.id + "-student-";
 const result = await db.$transaction(async tx => {
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId} FOR UPDATE`;
  const existing = await tx.user.findMany({select:{id:true,email:true,legacyId:true,organizationId:true,externalId:true}});
  const emails = new Map(existing.map(u=>[u.email.toLowerCase(),u]));
  const externalIds = new Set(existing.filter(u=>u.organizationId===organizationId).map(u=>u.externalId));
  const sourceEmails = new Map<string,number>();
  const sourceUids = new Map<string,number>();
  for(const r of students) {
   const email=(r.user_email||"").trim().toLowerCase();
   sourceEmails.set(email,(sourceEmails.get(email)||0)+1);
   const uid=r.user_uid||""; sourceUids.set(uid,(sourceUids.get(uid)||0)+1);
  }
  const rows: Prisma.UserCreateManyInput[] = []; let alreadyImported=0, syntheticEmails=0;
  for(const r of students) {
   const id=prefix+r.user_id;
   if(existing.some(u=>u.id===id)) {alreadyImported++;continue;}
   // Never merge identities by name, reuse passwords, or take an existing email.
   let email=(r.user_email||"").trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || sourceEmails.get(email)!==1 || emails.has(email)) {
    email=id+"@archive.invalid"; syntheticEmails++;
   }
   if(emails.has(email)) throw new Error("Reserved archive email conflict; no records written.");
   const uid=r.user_uid||"";
   const externalId=Number(uid)>0 && sourceUids.get(uid)===1 && !externalIds.has(uid)?uid:null;
   if(externalId) externalIds.add(externalId);
   rows.push({id,legacyId:Number(r.user_id),organizationId,email,externalId,name:r.user_name||"Student #"+r.user_id,role:"STUDENT" as const,roles:["STUDENT" as const],isActive:false,password:""});
  }
  const knownIds=new Set(students.map(r=>Number(r.user_id)));
  const report={sourceStudents:students.length,alreadyImported,toCreate:rows.length,syntheticEmails,linkedRatings:await tx.historicalRating.count({where:{task:{importId:archive.id},studentLegacyId:{in:[...knownIds]}}}),unresolvedStudentIds:new Set(data.dg_mark.filter(r=>!knownIds.has(Number(r.id_user))).map(r=>r.id_user)).size};
  if(process.argv.includes("--apply")) {
   const password=await hash(randomBytes(48).toString("hex"),12);
   await tx.user.createMany({data:rows.map(r=>({...r,password}))});
  }
  return {...report,applied:process.argv.includes("--apply")};
 },{timeout:60000});
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
