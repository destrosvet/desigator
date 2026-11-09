import {NextResponse} from "next/server";
import {publicSubjectResults} from "@/lib/public-results";
export const dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{token:string}>}){const {token}=await params;const data=await publicSubjectResults(token);return NextResponse.json(data??{error:"notFound"},{status:data?200:404,headers:{"Cache-Control":"no-store"}});}
