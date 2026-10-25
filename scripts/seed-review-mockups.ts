import { randomUUID } from "crypto";
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { uploadFile } from '../src/lib/s3';
const db = new PrismaClient();
const palettes = [['#f2e8cf','#d93b30','#172f46'],['#152a37','#d6ef72','#f4f3e9'],['#f6c7b8','#6c3c87','#ea6540'],['#efede6','#154bdf','#ffab16'],['#f4e1bd','#296451','#e67446'],['#202020','#f4f4ef','#ee6cba']];
function artwork(i:number, view:number) {
 const [bg,accent,ink]=palettes[i%palettes.length]; const n=String(i+1).padStart(2,'0');
 const patterns=[
 `<circle cx="600" cy="390" r="250" fill="${accent}"/><path d="M300 650L700 130L1030 650Z" fill="${ink}"/><text x="70" y="790" font-size="90" fill="${ink}">FORM / ${n}</text>`,
 `<rect x="60" y="60" width="1080" height="780" rx="30" fill="${ink}"/><text x="115" y="210" font-size="110" fill="${bg}">TYPE</text><text x="115" y="340" font-size="110" fill="${accent}">MATTERS.</text>${[0,1,2,3,4].map(k=>`<rect x="115" y="${430+k*52}" width="${800-k*95}" height="20" fill="${bg}" opacity=".7"/>`).join('')}`,
 `<rect x="150" y="200" width="330" height="470" rx="12" fill="${accent}"/><path d="M480 200L640 125V595L480 670Z" fill="${ink}"/><path d="M150 200L310 125H640L480 200Z" fill="white"/><text x="180" y="310" font-size="48" fill="${bg}">BOTANICA</text><circle cx="315" cy="470" r="100" fill="${bg}"/><path d="M300 560Q190 350 400 370Q430 520 300 560" fill="${ink}"/><text x="740" y="360" font-size="50" fill="${ink}">NATURAL</text><text x="740" y="425" font-size="35" fill="${ink}">IDENTITY ${n}</text>`,
 `<rect x="85" y="80" width="1030" height="740" rx="28" fill="white"/><rect x="85" y="80" width="260" height="740" rx="28" fill="${ink}"/><text x="125" y="160" font-size="35" fill="${bg}">STUDIO</text>${[0,1,2,3].map(k=>`<rect x="125" y="${250+k*70}" width="150" height="15" rx="7" fill="${bg}" opacity=".6"/>`).join('')}<text x="390" y="175" font-size="42" fill="${ink}">Creative dashboard</text>${[0,1,2].map(k=>`<rect x="${390+k*225}" y="230" width="195" height="140" rx="15" fill="${k===1?accent:bg}"/>`).join('')}<path d="M400 680L500 540L600 590L700 450L800 490L1040 390" fill="none" stroke="${accent}" stroke-width="16"/>`,
 `<ellipse cx="600" cy="690" rx="360" ry="80" fill="${ink}" opacity=".12"/><path d="M300 340L600 170L900 340L600 520Z" fill="${accent}"/><path d="M300 340L600 520V740L300 560Z" fill="${ink}"/><path d="M600 520L900 340V560L600 740Z" fill="white"/><circle cx="600" cy="280" r="75" fill="${bg}"/><text x="75" y="100" font-size="42" fill="${ink}">VOLUME / OBJECT ${n}</text>`,
 `${Array.from({length:9},(_,k)=>`<circle cx="${200+(k%3)*400}" cy="${160+Math.floor(k/3)*280}" r="${65+(i*7+k*13)%65}" fill="${k%2?accent:ink}"/><path d="M${120+(k%3)*400} ${150+Math.floor(k/3)*280}h160" stroke="${bg}" stroke-width="14"/>`).join('')}`
 ];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="${bg}"/><g font-family="sans-serif" ${view?'transform="translate(-200 -130) scale(1.5)"':''}>${patterns[i%6]}</g></svg>`;
}
async function main() {
 const url = new URL(process.env.DATABASE_URL || "");
 if(url.pathname !== '/desigator_preview' || process.env.S3_BUCKET !== 'desigator-preview' || !['127.0.0.1','localhost'].includes(url.hostname)) throw Error('Only local desigator_preview environment is allowed');
 const teacher = await db.user.findUniqueOrThrow({where:{email:'teacher@desigator.cz'}});
 const tasks = await db.task.findMany({where:{creatorId:teacher.id,title:{in:['Digitální ilustrace – geometrická kompozice','Vizuální identita kulturní akce']}},include:{subject:true}});
 if(tasks.length !== 2) throw Error('Expected seeded design tasks');
 const names=['Anna Nováková','Adam Dvořák','Eliška Veselá','Tomáš Černý','Tereza Procházková','Jakub Kučera','Sofie Malá','Matěj Svoboda'];
 const password=await bcrypt.hash('student123',12); let files=0; let reviews=0;
 for(const [index,name] of names.entries()) {
  const student=await db.user.upsert({where:{email:'mock.student'+(index+1)+'@desigator.cz'},update:{},create:{name,email:'mock.student'+(index+1)+'@desigator.cz',password,role:'STUDENT',roles:['STUDENT'],organizationId:teacher.organizationId,externalId:'MOCK'+String(index+1).padStart(3,'0')}});
  for(const [taskIndex,task] of tasks.entries()) {
   await db.classStudent.upsert({where:{classId_studentId:{classId:task.subject.classId,studentId:student.id}},update:{},create:{classId:task.subject.classId,studentId:student.id}});
   for(const version of index===names.length-1 ? [1] : [1,2]) {
    const stage=version===1?'WIP':'FINAL';
    const work=await db.submission.upsert({where:{taskId_studentId_version:{taskId:task.id,studentId:student.id,version}},update:{},create:{taskId:task.id,studentId:student.id,version,stage,uploadedById:teacher.id,status:stage==='FINAL'?'UNDER_REVIEW':'SUBMITTED',changeNote:stage==='WIP'?'První návrh ke konzultaci.':'Dopracované vizuální řešení a detail.',content:'Demonstrační práce pro vyzkoušení hodnocení. Nejde o skutečnou studentskou práci.'}});
    for(let view=0;view<(version===1?1:2);view++) {
     const key='demo-review/'+task.id+'/'+student.id+'/v'+version+'-'+view+'.png';
     if(await db.attachment.findUnique({where:{s3Key:key}})) continue;
     const source=sharp(Buffer.from(artwork(index+taskIndex*3,view)));
     const buffer=await(version===1?source.blur(2):source).png().toBuffer(); const id=randomUUID();
     await uploadFile(key,buffer,'image/png');
     await db.attachment.create({data:{id,filename:'navrh-'+view+'.png',originalName:version===1?'Rozpracovaný návrh.png':view?'Detail zpracování.png':'Finální návrh.png',mimeType:'image/png',size:buffer.length,s3Key:key,s3Url:'/api/uploads/'+id,submissionId:work.id}}); files++;
    }
    if(stage==='FINAL') {await db.evaluation.upsert({where:{submissionId_evaluatorId:{submissionId:work.id,evaluatorId:teacher.id}},update:{},create:{submissionId:work.id,evaluatorId:teacher.id}});reviews++;}
   }
  }
 }
 console.log(JSON.stringify({students:names.length,tasks:tasks.map(task=>({id:task.id,title:task.title})),teacherReviews:reviews,newFiles:files}));
}
main().finally(()=>db.$disconnect());
