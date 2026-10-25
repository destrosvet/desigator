import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { managedSubjectScope } from "@/lib/authorization";
import { historicalCourseScope } from "@/lib/statistics";
import { canTeach,isAdmin,isSchoolAdmin } from "@/lib/permissions";
const schema=z.object({kind:z.enum(['subject','organization','teacher']),search:z.string().trim().max(200).default(''),source:z.enum(['all','current','historical']).default('all'),year:z.coerce.number().int().min(1900).max(2200).optional(),organizationId:z.string().min(1).optional()}).strict();
export async function GET(req:Request){
 const session=await getServerSession(authOptions);if(!session||!canTeach(session.user))return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=schema.safeParse(Object.fromEntries(new URL(req.url).searchParams));if(!parsed.success)return NextResponse.json({error:'Neplatné hledání.'},{status:400});
 const {kind,search,source,year,organizationId}=parsed.data;const user=session.user;
 if(organizationId&&!isAdmin(user)&&organizationId!==user.organizationId)return NextResponse.json({error:'Forbidden'},{status:403});
 const tokens=search.split(/\s+/).filter(Boolean).slice(0,6);const contains=(text:string)=>({contains:text,mode:'insensitive' as const});
 try{
  let options:{id:string;name:string}[]=[];
  if(kind==='organization'){
   if(!isAdmin(user))return NextResponse.json({error:'Forbidden'},{status:403});
   options=await db.organization.findMany({where:{AND:tokens.map(t=>({name:contains(t)}))},select:{id:true,name:true},take:21,orderBy:[{name:'asc'},{id:'asc'}]});
  }else if(kind==='teacher'){
   if(!organizationId||!(isAdmin(user)||isSchoolAdmin(user)))return NextResponse.json({error:'Forbidden'},{status:403});
   options=await db.user.findMany({where:{organizationId,isActive:true,AND:[{OR:[{roles:{has:'TEACHER'}},{roles:{isEmpty:true},role:'TEACHER'}]},...tokens.map(t=>({name:contains(t)}))]},select:{id:true,name:true},take:21,orderBy:[{name:'asc'},{id:'asc'}]});
  }else{
   const matchTokens=tokens.map(t=>({OR:[{name:contains(t)},{code:contains(t)},...(/^\d{4}$/.test(t)?[{year:Number(t)}]:[])]}));
   const currentWhere:Prisma.SubjectWhereInput={AND:[managedSubjectScope(user),...matchTokens,...(organizationId?[{class:{organizationId}}]:[]),...(year?[{year}]:[])]};
   const historicalWhere:Prisma.HistoricalCourseWhereInput={AND:[historicalCourseScope(user),...matchTokens,...(organizationId?[{import:{organizationId}}]:[]),...(year?[{year}]:[])]};
   const [current,historical]=await Promise.all([source==='historical'?[]:db.subject.findMany({where:currentWhere,select:{id:true,name:true,code:true,year:true},orderBy:[{name:'asc'},{id:'asc'}],take:21}),source==='current'?[]:db.historicalCourse.findMany({where:historicalWhere,select:{id:true,name:true,code:true,year:true},orderBy:[{name:'asc'},{id:'asc'}],take:21})]);
   options=[...current.map(s=>({id:'current:'+s.id,name:(s.code?s.code+' · ':'')+s.name+' · '+s.year})),...historical.map(s=>({id:'historical:'+s.id,name:(s.code?s.code+' · ':'')+s.name+' · '+(s.year??'rok neuveden')+' (archiv)'}))].sort((a,b)=>a.name.localeCompare(b.name,'cs')||a.id.localeCompare(b.id));
  }
  return NextResponse.json({options:options.slice(0,20),hasMore:options.length>20},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Hledání se nepodařilo načíst.'},{status:500});}
}
