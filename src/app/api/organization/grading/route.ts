import {getServerSession} from "next-auth";
import {NextResponse} from "next/server";
import {authOptions} from "@/lib/auth";
import {db} from "@/lib/db";
import {organizationTarget,canManageOrganization} from "@/lib/organization-access";
import {gradingScaleSchema} from "@/lib/grading-scale";
export async function PATCH(req:Request){
 const session=await getServerSession(authOptions);
 if(!session)return NextResponse.json({error:"unauthorized"},{status:401});
 const target=organizationTarget(session.user,req);
 if(!canManageOrganization(session.user,target))return NextResponse.json({error:"forbidden"},{status:403});
 const parsed=gradingScaleSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"invalidScale"},{status:400});
 const school=await db.organization.findUnique({where:{id:target!},select:{id:true}});
 if(!school)return NextResponse.json({error:"notFound"},{status:404});
 await db.organization.update({where:{id:target!},data:{gradingScale:parsed.data}});
 return NextResponse.json({gradingScale:parsed.data},{headers:{"Cache-Control":"no-store"}});
}
