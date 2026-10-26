import {NextResponse} from "next/server";
import {publicResults} from "@/lib/public-results";
export const dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{classId:string}>}){const {classId}=await params;const data=await publicResults(classId,new URL(req.url).searchParams.get("subjectId")||undefined);return NextResponse.json(data??{error:"notFound"},{status:data?200:404,headers:{"Cache-Control":"no-store"}});}
