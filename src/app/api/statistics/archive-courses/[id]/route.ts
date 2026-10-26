import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin,isSchoolAdmin } from "@/lib/permissions";
export async function PATCH(req: Request,{params}:{params:Promise<{id:string}>}) {
 const session=await getServerSession(authOptions);
 if(!session||!(isAdmin(session.user)||isSchoolAdmin(session.user)))return NextResponse.json({error:'Forbidden'},{status:403});
 try {
  const {teacherId}=z.object({teacherId:z.string().min(1).nullable()}).strict().parse(await req.json());const {id}=await params;
  const course=await db.historicalCourse.findFirst({where:{id,...(isAdmin(session.user)?{}:{import:{organizationId:session.user.organizationId!}})},select:{id:true,import:{select:{organizationId:true}}}});
  if(!course)return NextResponse.json({error:'Předmět nebyl nalezen.'},{status:404});
  if(teacherId&&!await db.user.findFirst({where:{id:teacherId,organizationId:course.import.organizationId,isActive:true,OR:[{roles:{has:'TEACHER'}},{roles:{isEmpty:true},role:'TEACHER'}]},select:{id:true}}))return NextResponse.json({error:'Vyberte učitele ze stejné školy.'},{status:400});
  await db.historicalCourse.update({where:{id},data:{teacherId}});return NextResponse.json({success:true});
 }catch{return NextResponse.json({error:'Přiřazení se nepodařilo uložit.'},{status:400});}
}
