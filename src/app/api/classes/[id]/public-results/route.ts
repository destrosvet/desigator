import {randomBytes} from "node:crypto";
import {getServerSession} from "next-auth";
import {NextResponse} from "next/server";
import {z} from "zod";
import {authOptions} from "@/lib/auth";
import {canManageClass} from "@/lib/authorization";
import {db} from "@/lib/db";
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getServerSession(authOptions);if(!session)return reply({error:"unauthorized"},401);
 const {id}=await params;if(!await canManageClass(session.user,id))return reply({error:"forbidden"},403);
 const classroom=await db.class.findFirst({where:{id,isActive:true},select:{publicResultsEnabled:true,resultsShare:{select:{token:true}}}});
 if(!classroom)return reply({error:"notFound"},404);
 return reply({enabled:classroom.publicResultsEnabled,token:classroom.publicResultsEnabled?classroom.resultsShare?.token??null:null});
}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getServerSession(authOptions);if(!session)return reply({error:"unauthorized"},401);
 const {id}=await params;if(!await canManageClass(session.user,id))return reply({error:"forbidden"},403);
 const input=z.object({enabled:z.boolean(),rotate:z.boolean().optional()}).strict().safeParse(await req.json().catch(()=>null));
 if(!input.success||(!input.data.enabled&&input.data.rotate))return reply({error:"invalidInput"},400);
 const result=await db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM classes WHERE id = ${id} FOR UPDATE`;
 const classroom=await tx.class.findFirst({where:{id,isActive:true},select:{id:true}});if(!classroom)return null;
 let token:string|null=null;
 if(input.data.enabled){const fresh=randomBytes(32).toString("hex");const share=await tx.resultsShare.upsert({where:{classId:id},create:{classId:id,token:fresh},update:input.data.rotate?{token:fresh}:{},select:{token:true}});token=share.token;}
 else await tx.resultsShare.deleteMany({where:{classId:id}});
 await tx.class.update({where:{id},data:{publicResultsEnabled:input.data.enabled}});
 return {enabled:input.data.enabled,token};
 });return result?reply(result):reply({error:"notFound"},404);
}
