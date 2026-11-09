import {test,expect} from "@playwright/test";
import {PrismaClient} from "@prisma/client";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import {randomUUID} from "node:crypto";
import {uploadFile,deleteFile} from "../../src/lib/s3";
test.skip(process.env.E2E_PUBLIC_RESULTS!=="true","Requires an isolated public-results database");
test.use({actionTimeout:10000});
test("anonymous subject results, image tooltips, private versions and revocation",async({browser,baseURL},testInfo)=>{
 test.setTimeout(60000);
 const url=process.env.E2E_PUBLIC_RESULTS_DATABASE_URL||"";const database=new URL(url).pathname;
 if(database!=="/desigator_public_results_test"&&!(process.env.CI&&database==="/desigator_ci"))throw Error("Requires isolated results database");
 const db=new PrismaClient({datasourceUrl:url});const school=await db.organization.create({data:{name:"Subject results test school "+randomUUID()}});const password=await bcrypt.hash("Results-test-123",10);
 const teacher=await db.user.create({data:{name:"Subject results school admin",email:randomUUID()+"@example.test",password,role:"TEACHER",roles:["SCHOOL_ADMIN","TEACHER"],organizationId:school.id}});
 const student=await db.user.create({data:{name:"PRIVATE_STUDENT_NAME",email:randomUUID()+"@example.test",password,role:"STUDENT",roles:["STUDENT"],externalId:"S002",organizationId:school.id}});
 const evaluator=await db.user.findUniqueOrThrow({where:{email:"evaluator@desigator.cz"}});
 const key="subject-public-results-test/"+randomUUID()+".png";const png=await sharp({create:{width:360,height:240,channels:3,background:"#5865d9"}}).png().toBuffer();const stored=await uploadFile(key,png,"image/png");
 const classroom=await db.class.create({data:{name:"Subject public results test "+randomUUID().slice(0,8),code:randomUUID(),teacherId:teacher.id,organizationId:teacher.organizationId!,students:{create:{studentId:student.id}}}});
 const subject=await db.subject.create({data:{name:"Design subject results "+randomUUID().slice(0,8),code:randomUUID(),classId:classroom.id,classes:{create:{classId:classroom.id}},teacherId:teacher.id,year:2026}});
 const task=await db.task.create({data:{title:"Poster subject result",maxPoints:100,status:"PUBLISHED",creatorId:teacher.id,subjectId:subject.id}});
 const work=await db.submission.create({data:{taskId:task.id,studentId:student.id,stage:"FINAL",status:"EVALUATED",resultsPublishedAt:new Date(),resultsPublishedById:teacher.id,evaluations:{create:[{evaluatorId:teacher.id,status:"COMPLETED",totalPoints:88,feedback:"Zveřejněný komentář k předmětu"},{evaluatorId:evaluator.id,status:"COMPLETED",totalPoints:92}]},attachments:{create:{filename:"private.png",originalName:"PRIVATE_STUDENT_NAME.png",mimeType:"image/png",size:png.length,s3Key:key,s3Url:stored.url}}},include:{attachments:true}});
 const teacherContext=await browser.newContext({baseURL}),anonymousContext=await browser.newContext({baseURL});
 try{
 const page=await anonymousContext.newPage(),admin=await teacherContext.newPage();let endpoint="/api/public/results/subject/"+subject.id,href="/cs/results/subject/"+subject.id,preview=endpoint+"/preview/"+work.attachments[0].id;
 expect((await page.request.get(endpoint)).status()).toBe(404);expect((await page.request.patch("/api/subjects/"+subject.id+"/public-results",{data:{enabled:true}})).status()).toBe(401);
 await admin.goto("/cs/auth/login");await admin.getByLabel("E-mail",{exact:true}).fill(teacher.email);await admin.getByLabel("Heslo",{exact:true}).fill("Results-test-123");await admin.getByRole("button",{name:/Přihlásit/}).click();await expect(admin).toHaveURL(/dashboard/);
 await admin.goto("/cs/subjects/"+subject.id);admin.once("dialog",d=>d.accept());await admin.getByRole("button",{name:"Zapnout veřejné výsledky",exact:true}).click();await expect(admin.getByRole("button",{name:"Vypnout veřejné výsledky",exact:true})).toBeVisible();
 const share=await(await admin.request.get("/api/subjects/"+subject.id+"/public-results")).json();expect(share.token).toMatch(/^[a-f0-9]{64}$/);
 expect((await page.request.get(endpoint)).status()).toBe(404);expect((await page.request.get("/api/subjects/"+subject.id+"/public-results")).status()).toBe(401);
 endpoint="/api/public/results/subject/"+share.token;href="/cs/results/subject/"+share.token;preview=endpoint+"/preview/"+work.attachments[0].id;
 const data=await(await page.request.get(endpoint)).json();expect(data.rows[0]).toMatchObject({studentId:student.externalId,total:90,grade:"A"});expect(JSON.stringify(data)).not.toMatch(/PRIVATE_|student1@|feedback|originalName/);expect(JSON.stringify(data)).not.toContain(student.id);
 await page.goto(href);await expect(page.getByRole("heading",{name:subject.name,exact:true})).toBeVisible();await expect(page.getByRole("rowheader",{name:student.externalId!,exact:true})).toBeVisible();await expect(page.getByRole("cell",{name:"A",exact:true})).toBeVisible();expect(await page.content()).not.toContain(student.email);await expect(page.getByRole("navigation",{name:"Předmět a rok",exact:true})).toHaveCount(0);
 const points=page.getByRole("button",{name:/S002.*Poster subject result.*90/});await points.hover();const image=page.locator("[data-slot=tooltip-content]").getByRole("img").first();await expect(image).toBeVisible();await expect(page.locator("[data-slot=tooltip-content]").getByText("Zveřejněný komentář k předmětu",{exact:true}).first()).toBeVisible();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);await page.screenshot({path:testInfo.outputPath("subject-public-results-desktop.png"),fullPage:true,animations:"disabled"});
 expect((await page.request.get(preview)).headers()["content-type"]).toBe("image/webp");expect((await page.request.get("/api/uploads/"+work.attachments[0].id)).status()).toBe(401);
 await admin.goto("/cs/subjects/"+subject.id);const previousEndpoint=endpoint,previousPreview=preview;admin.once("dialog",d=>d.accept());await admin.getByRole("button",{name:"Vygenerovat nový odkaz",exact:true}).click();await expect.poll(async()=>{const current=await(await admin.request.get("/api/subjects/"+subject.id+"/public-results")).json();return current.token;}).not.toBe(share.token);
 const replacement=await(await admin.request.get("/api/subjects/"+subject.id+"/public-results")).json();expect((await page.request.get(previousEndpoint)).status()).toBe(404);expect((await page.request.get(previousPreview)).status()).toBe(404);endpoint="/api/public/results/subject/"+replacement.token;href="/cs/results/subject/"+replacement.token;preview=endpoint+"/preview/"+work.attachments[0].id;expect((await page.request.get(endpoint)).status()).toBe(200);
 await admin.getByRole("button",{name:"Vypnout veřejné výsledky",exact:true}).click();await expect(admin.getByRole("button",{name:"Zapnout veřejné výsledky",exact:true})).toBeVisible();expect((await page.request.get(endpoint)).status()).toBe(404);expect((await page.request.get(preview)).status()).toBe(404);const response=await page.goto(href);expect(response?.status()).toBe(404);
 }finally{await Promise.allSettled([teacherContext.close(),anonymousContext.close()]);await db.task.delete({where:{id:task.id}});await db.subject.delete({where:{id:subject.id}});await db.class.delete({where:{id:classroom.id}});await deleteFile(key);await db.user.delete({where:{id:student.id}});await db.user.delete({where:{id:teacher.id}});await db.organization.delete({where:{id:school.id}});await db.$disconnect();}
});
