import {getServerSession} from "next-auth";import {NextResponse} from "next/server";import {z} from "zod";import {authOptions} from "@/lib/auth";import {db} from "@/lib/db";import {canManageSubject} from "@/lib/authorization";import {parseAdjustmentCents} from "@/lib/result-adjustments";
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getServerSession(authOptions);if(!session)return reply({error:"unauthorized"},401);const {id}=await params;if(!await canManageSubject(session.user,id))return reply({error:"forbidden"},403);
 const parsed=z.object({studentId:z.string().min(1),points:z.string(),reason:z.string().trim().min(2).max(2000),visibleToStudent:z.boolean(),requestId:z.string().uuid()}).strict().safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return reply({error:"invalidInput"},400);const input=parsed.data,amountCents=parseAdjustmentCents(input.points);if(amountCents===null)return reply({error:"invalidPoints"},400);
 const result=await db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM subjects WHERE id = ${id} FOR UPDATE`;
 const subject=await tx.subject.findFirst({where:{id,isActive:true,class:{isActive:true}},select:{classId:true,class:{select:{organizationId:true}}}});if(!subject)return {error:"notFound"};
 const member=await tx.classStudent.findFirst({where:{classId:subject.classId,studentId:input.studentId,student:{isActive:true,organizationId:subject.class.organizationId}},select:{id:true}});if(!member)return {error:"notMember"};
 const previous=await tx.pointAdjustment.findUnique({where:{requestId:input.requestId}});if(previous)return previous.subjectId===id&&previous.studentId===input.studentId&&previous.amountCents===amountCents&&previous.reason===input.reason&&previous.visibleToStudent===input.visibleToStudent?{id:previous.id}:{error:"conflict"};
 const created=await tx.pointAdjustment.create({data:{subjectId:id,studentId:input.studentId,amountCents,reason:input.reason,visibleToStudent:input.visibleToStudent,authorId:session.user.id,requestId:input.requestId}});return {id:created.id};
 });return reply(result,"error" in result?409:201);
}
