import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canTeach, isAdmin } from "@/lib/permissions";
import { statisticsQuery, getStatistics } from "@/lib/statistics";
export async function GET(req: Request) {
 const session=await getServerSession(authOptions);
 if(!session||!canTeach(session.user))return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=statisticsQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
 if(!parsed.success)return NextResponse.json({error:'Neplatné filtry statistik.'},{status:400});
 if(parsed.data.organizationId&&!isAdmin(session.user)&&parsed.data.organizationId!==session.user.organizationId)return NextResponse.json({error:'Forbidden'},{status:403});
 try{return NextResponse.json(await getStatistics(session.user,parsed.data),{headers:{'Cache-Control':'no-store'}});}catch(error){console.error('Statistics failed',error);return NextResponse.json({error:'Statistiky se nepodařilo načíst.'},{status:500});}
}
