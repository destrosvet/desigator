import {randomBytes} from "node:crypto";
import {getServerSession} from "next-auth";
import {NextResponse} from "next/server";
import {z} from "zod";
import {authOptions} from "@/lib/auth";
import {canManageSubject} from "@/lib/authorization";
import {db} from "@/lib/db";
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getServerSession(authOptions);if(!session)return reply({error:"unauthorized"},401);
 const {id}=await params;if(!await canManageSubject(session.user,id))return reply({error:"forbidden"},403);
 const subject=await db.subject.findFirst({where:{id,isActive:true},select:{publicResultsEnabled:true,resultsShare:{select:{token:true}}}});
 if(!subject)return reply({error:"notFound"},404);
 return reply({enabled:subject.publicResultsEnabled,token:subject.publicResultsEnabled?subject.resultsShare?.token??null:null});
}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getServerSession(authOptions);if(!session)return reply({error:"unauthorized"},401);
 const {id}=await params;if(!await canManageSubject(session.user,id))return reply({error:"forbidden"},403);
 const input=z.object({enabled:z.boolean(),rotate:z.boolean().optional()}).strict().safeParse(await req.json().catch(()=>null));
 if(!input.success||(!input.data.enabled&&input.data.rotate))return reply({error:"invalidInput"},400);
 const result=await db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM subjects WHERE id = ${id} FOR UPDATE`;
 const subject=await tx.subject.findFirst({where:{id,isActive:true},select:{id:true}});if(!subject)return null;
 let token:string|null=null;
 if(input.data.enabled){const fresh=randomBytes(32).toString("hex");const share=await tx.subjectResultsShare.upsert({where:{subjectId:id},create:{subjectId:id,token:fresh},update:input.data.rotate?{token:fresh}:{},select:{token:true}});token=share.token;}
 else await tx.subjectResultsShare.deleteMany({where:{subjectId:id}});
 await tx.subject.update({where:{id},data:{publicResultsEnabled:input.data.enabled}});
 return {enabled:input.data.enabled,token};
 });return result?reply(result):reply({error:"notFound"},404);
}
