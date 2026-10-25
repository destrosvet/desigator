import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { teacherStatePath } from "./auth-setup";
test.skip(process.env.E2E_PUBLICATION !== "true", "Requires an isolated publication database");
async function login(page: Page, email: string, password: string) {
 await page.goto("/cs/auth/login"); await page.getByLabel("E-mail",{exact:true}).fill(email); await page.getByLabel("Heslo",{exact:true}).fill(password); await page.getByRole("button",{name:/Přihlásit/i}).click(); await expect(page).toHaveURL(/dashboard/);
}
test("teacher publishes and withdraws a complete commission without leaking private scores",async({browser,baseURL},testInfo)=>{
 test.setTimeout(120000);
 const url=process.env.E2E_PUBLICATION_DATABASE_URL||"";
 if(!/^\/desigator_publication_test$/.test(new URL(url).pathname)&&!(process.env.CI&&new URL(url).pathname==="/desigator_ci"))throw new Error("Requires isolated publication database");
 const db=new PrismaClient({datasourceUrl:url});
 const teacherContext=await browser.newContext({baseURL,storageState:teacherStatePath});const studentContext=await browser.newContext({baseURL});const evaluatorContext=await browser.newContext({baseURL});const foreignContext=await browser.newContext({baseURL});
 const foreign=await db.user.create({data:{name:"Foreign publication teacher",email:"publication-"+randomBytes(6).toString("hex")+"@example.test",password:await bcrypt.hash("Publication-test-123",12),role:"TEACHER",roles:["TEACHER"],organizationId:"legacy"}});
 try {
  const teacher=await teacherContext.newPage();const student=await studentContext.newPage();const evaluator=await evaluatorContext.newPage();const other=await foreignContext.newPage();
  await teacher.goto("/cs/dashboard"); await login(student,"student3@desigator.cz","student123");await login(evaluator,"evaluator@desigator.cz","evaluator123");await login(other,foreign.email,"Publication-test-123");
  const {subjects}=await(await teacher.request.get("/api/subjects")).json();const created=await teacher.request.post("/api/tasks",{data:{title:"Publication E2E "+Date.now(),subjectId:subjects[0].id,maxPoints:100,criteria:[{name:"Provedení",maxPoints:100}]}});expect(created.status()).toBe(201);const {task}=await created.json();
  await teacher.request.patch("/api/tasks/"+task.id,{data:{status:"PUBLISHED"}});
  const submitted=await student.request.post("/api/submissions",{multipart:{taskId:task.id,content:"Final publication work",stage:"FINAL"}});expect(submitted.status()).toBe(201);const {submission}=await submitted.json();
  const self=await(await teacher.request.post("/api/evaluations",{data:{submissionId:submission.id}})).json();const evaluatorSession=await(await evaluator.request.get("/api/auth/session")).json();const assigned=await(await teacher.request.post("/api/evaluations",{data:{submissionId:submission.id,evaluatorId:evaluatorSession.user.id}})).json();
  const scores=(points:number)=>[{criterionId:task.criteria[0].id,points,comment:"Komentář ke kritériu"}];
  expect((await teacher.request.patch("/api/evaluations/"+self.evaluation.id,{data:{status:"COMPLETED",feedback:"Soukromá zpětná vazba učitele",scores:scores(0)}})).status()).toBe(200);
  const endpoint="/api/submissions/"+submission.id+"/publication";
  expect((await teacher.request.patch(endpoint,{data:{published:true}})).status()).toBe(409);
  expect((await student.request.patch(endpoint,{data:{published:true}})).status()).toBe(403);expect((await evaluator.request.patch(endpoint,{data:{published:true}})).status()).toBe(403);expect((await other.request.patch(endpoint,{data:{published:true}})).status()).toBe(403);
  expect((await evaluator.request.patch("/api/evaluations/"+assigned.evaluation.id,{data:{status:"COMPLETED",feedback:"Soukromá zpětná vazba hodnotitele",scores:scores(70)}})).status()).toBe(200);
  async function assertHidden(){expect((await student.request.get("/api/evaluations/"+self.evaluation.id)).status()).toBe(404);const detail=await(await student.request.get("/api/tasks/"+task.id)).json();expect(detail.task.submissions.find((work:{id:string})=>work.id===submission.id).evaluations).toHaveLength(0);const list=await(await student.request.get("/api/evaluations?taskId="+task.id)).json();expect(list.total).toBe(0);}
  await assertHidden();
  const studentSession=await(await student.request.get("/api/auth/session")).json();const workHref="/cs/tasks/"+task.id+"/students/"+studentSession.user.id;
  await student.goto(workHref);await expect(student.getByText("Výsledky této verze zatím nebyly zveřejněny.",{exact:true})).toBeVisible();expect(await student.content()).not.toContain("Soukromá zpětná vazba");
  // Publication and grading share a row lock: either publication wins or the draft wins, never both.
  const race=await Promise.all([teacher.request.patch(endpoint,{data:{published:true}}),teacher.request.patch("/api/evaluations/"+self.evaluation.id,{data:{status:"IN_PROGRESS",scores:scores(0)}})]);expect(race.map(response=>response.status()).sort()).toEqual([200,409]);
  await teacher.request.patch(endpoint,{data:{published:false}});await teacher.request.patch("/api/evaluations/"+self.evaluation.id,{data:{status:"COMPLETED",feedback:"Soukromá zpětná vazba učitele",scores:scores(0)}});
  await teacher.goto(workHref);await teacher.getByRole("button",{name:"Zveřejnit výsledky",exact:true}).click();await teacher.getByRole("alertdialog").getByRole("button",{name:"Zrušit",exact:true}).click();await assertHidden();
  await teacher.getByRole("button",{name:"Zveřejnit výsledky",exact:true}).click();await teacher.getByRole("alertdialog").getByRole("button",{name:"Zveřejnit výsledky",exact:true}).click();await expect(teacher.getByText("Výsledky byly zveřejněny.",{exact:true})).toBeVisible();
  await student.reload();await expect(student.getByText("Soukromá zpětná vazba učitele",{exact:true})).toBeVisible();await expect(student.getByText("0 / 100 b.",{exact:true})).toBeVisible();const visible=await student.request.get("/api/evaluations/"+assigned.evaluation.id);expect(visible.status()).toBe(200);expect(visible.headers()["cache-control"]).toContain("no-store");expect((await(await student.request.get("/api/evaluations?taskId="+task.id)).json()).total).toBe(2);
  await teacher.screenshot({path:testInfo.outputPath("published-teacher.png"),fullPage:true});await student.setViewportSize({width:390,height:844});await student.screenshot({path:testInfo.outputPath("published-student-mobile.png"),fullPage:true});
  expect((await teacher.request.post("/api/evaluations",{data:{submissionId:submission.id}})).status()).toBe(409);expect((await evaluator.request.patch("/api/evaluations/"+assigned.evaluation.id,{data:{status:"COMPLETED",scores:scores(80)}})).status()).toBe(409);
  const secondStudent=await db.user.findUniqueOrThrow({where:{email:"student2@desigator.cz"}});const secondWork=await db.submission.create({data:{taskId:task.id,studentId:secondStudent.id,stage:"FINAL",content:"Unpublished queue neighbor"}});const secondAssignment=await(await teacher.request.post("/api/evaluations",{data:{submissionId:secondWork.id,evaluatorId:evaluatorSession.user.id}})).json();
  await evaluator.goto("/cs/evaluations/"+secondAssignment.evaluation.id);await expect(evaluator.getByLabel("Provedení",{exact:true})).toBeEnabled();await evaluator.getByRole("button",{name:"Další student",exact:true}).click();await expect(evaluator.getByLabel("Provedení",{exact:true})).toBeDisabled();await evaluator.getByRole("button",{name:"Předchozí student",exact:true}).click();await expect(evaluator.getByLabel("Provedení",{exact:true})).toBeEnabled();
  await evaluator.goto("/cs/evaluations/"+assigned.evaluation.id);await expect(evaluator.getByLabel("Provedení",{exact:true})).toBeDisabled();await expect(evaluator.getByText(/Výsledky jsou zveřejněné/)).toBeVisible();
  await teacher.getByRole("button",{name:"Stáhnout ze zveřejnění",exact:true}).click();await teacher.getByRole("alertdialog").getByRole("button",{name:"Stáhnout ze zveřejnění",exact:true}).click();await expect(teacher.getByText("Výsledky byly staženy ze zveřejnění.",{exact:true})).toBeVisible();await assertHidden();await student.reload();expect(await student.content()).not.toContain("Soukromá zpětná vazba");
  const preserved=await(await teacher.request.get("/api/evaluations/"+assigned.evaluation.id)).json();expect(preserved.evaluation.totalPoints).toBe(70);expect(preserved.evaluation.scores).toHaveLength(1);
  expect((await evaluator.request.patch("/api/evaluations/"+assigned.evaluation.id,{data:{status:"COMPLETED",feedback:"Opravený výsledek",scores:scores(80)}})).status()).toBe(200);expect((await teacher.request.patch(endpoint,{data:{published:true}})).status()).toBe(200);
  await student.reload();await expect(student.getByText("Opravený výsledek",{exact:true})).toBeVisible();
  const progress=await(await student.request.post("/api/submissions",{multipart:{taskId:task.id,content:"New WIP",stage:"WIP"}})).json();expect((await teacher.request.patch("/api/submissions/"+progress.submission.id+"/publication",{data:{published:true}})).status()).toBe(409);
  const final=await(await student.request.post("/api/submissions",{multipart:{taskId:task.id,content:"New final version",stage:"FINAL"}})).json();expect(final.submission.resultsPublishedAt).toBeNull();expect((await teacher.request.patch("/api/submissions/"+final.submission.id+"/publication",{data:{published:true}})).status()).toBe(409);
  const history=(await(await student.request.get("/api/tasks/"+task.id)).json()).task.submissions;expect(history.find((work:{id:string})=>work.id===submission.id).evaluations).toHaveLength(2);expect(history.find((work:{id:string})=>work.id===final.submission.id).evaluations).toHaveLength(0);
 }finally{await teacherContext.close();await studentContext.close();await evaluatorContext.close();await foreignContext.close();await db.user.delete({where:{id:foreign.id}});await db.$disconnect();}
});
