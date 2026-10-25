import {NextResponse} from "next/server";
import sharp from "sharp";
import {db} from "@/lib/db";
import {publicResults} from "@/lib/public-results";
import {getFile} from "@/lib/s3";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{classId:string;attachmentId:string}>}){
 const {classId,attachmentId}=await params;
 const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 const attachment=await db.attachment.findUnique({where:{id:attachmentId},select:{s3Key:true,submission:{select:{task:{select:{subjectId:true}}}}}});
 if(!attachment?.submission) return new NextResponse(null,{status:404,headers});
 const table=await publicResults(classId,attachment.submission.task.subjectId);
 if(!table?.rows.some(row=>row.cells.some(cell=>cell.images.some(image=>image.id===attachmentId)))) return new NextResponse(null,{status:404,headers});
 try {const buffer=await sharp(await getFile(attachment.s3Key)).rotate().resize(640,480,{fit:"inside",withoutEnlargement:true}).webp({quality:80}).toBuffer();return new NextResponse(new Uint8Array(buffer),{headers:{...headers,"Content-Type":"image/webp","Content-Disposition":'inline; filename="preview.webp"'}});}catch{return new NextResponse(null,{status:404,headers});}
}
