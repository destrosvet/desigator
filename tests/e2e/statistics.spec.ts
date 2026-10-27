import { expect,test,type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { teacherStatePath } from './auth-setup';
test.skip(process.env.E2E_STATISTICS!=='true','Requires the isolated preview database with historical archive');
test.use({ storageState: teacherStatePath });
async function login(page:Page,email:string,password:string){await page.goto('/cs/auth/login');await page.getByLabel(/e-mail/i).fill(email);await page.getByLabel(/heslo/i).fill(password);await page.getByRole('button',{name:/přihlásit/i}).click();await page.waitForURL(/dashboard/);}
test('administrator explores all 10328 historical ratings and can assign a subject to its teacher',async({browser,baseURL},testInfo)=>{
 const adminContext=await browser.newContext({baseURL});const teacherContext=await browser.newContext({baseURL,storageState:teacherStatePath});const studentContext=await browser.newContext({baseURL});
 try{
  const admin=await adminContext.newPage(),teacher=await teacherContext.newPage(),student=await studentContext.newPage();await login(admin,'admin@desigator.cz','admin123');
  const response=await admin.request.get('/api/statistics?source=historical');expect(response.status()).toBe(200);const result=await response.json();expect(result.summary.historicalRatings).toBe(10328);expect(result.summary.currentRatings).toBe(0);expect(result.summary.averagePercent).toBeGreaterThan(0);expect(result.imports[0].report.unknownStudents).toBe(305);
  await admin.goto('/cs/statistics');await admin.getByLabel('Zdroj dat').selectOption('historical');await expect(admin.getByTestId('ratings-total')).toHaveText(/10\s*328/);await expect(admin.getByRole('heading',{name:'Rozložení procentních výsledků'})).toBeVisible();await admin.screenshot({path:testInfo.outputPath('historical-statistics-desktop.png'),fullPage:true});
  await admin.getByRole('combobox',{name:'Škola',exact:true}).click();await admin.getByRole('combobox',{name:'Hledat: Škola',exact:true}).fill('Původní');await admin.getByRole('option',{name:'Původní organizace Desigator',exact:true}).click();
  await expect(admin.getByTestId('ratings-total')).toHaveText(/10\s*328/);
  await admin.getByRole('combobox',{name:'Předmět',exact:true}).click();const subjectSearch=admin.getByRole('combobox',{name:'Hledat: Předmět',exact:true});await subjectSearch.fill('nenalezitelnypredmet');await expect(admin.getByText('Žádné odpovídající výsledky.',{exact:true})).toBeVisible();
  await subjectSearch.fill('YPG-A 2013');await expect(admin.getByRole('option',{name:/YPG-A.*2013/})).toBeVisible();await subjectSearch.press('ArrowDown');await subjectSearch.press('Enter');await expect(admin.getByTestId('ratings-total')).not.toHaveText(/10\s*328/);
  await admin.getByRole('combobox',{name:'Předmět',exact:true}).click();await admin.getByRole('option',{name:'Všechny dostupné předměty',exact:true}).click();await expect(admin.getByTestId('ratings-total')).toHaveText(/10\s*328/);
  const subject=result.summary.subjects.find((s:{id:string})=>s.id.startsWith('historical:'));const courseId=subject.id.slice('historical:'.length);const owner=(await(await admin.request.get('/api/statistics/options?kind=teacher&organizationId=legacy&search='+encodeURIComponent('Pan Učitel'))).json()).options[0];expect(owner).toBeTruthy();
  const archivePanel=admin.locator('[data-slot="card"]').filter({has:admin.getByRole('heading',{name:'Přiřazení archivních předmětů učitelům'})});
  const course=result.archiveCourses.find((c:{id:string})=>c.id===courseId);
  await archivePanel.getByRole('textbox',{name:'Vyhledat…',exact:true}).fill(course.name);await archivePanel.getByRole('button',{name:'Hledat',exact:true}).click();
  const assignment=archivePanel.getByRole('combobox',{name:'Učitel předmětu '+courseId,exact:true});await assignment.click();await admin.getByRole('option',{name:'Zatím nepřiřazen',exact:true}).click();
  await expect.poll(async()=>(await(await teacher.request.get('/api/statistics?source=historical&subjectId='+encodeURIComponent(subject.id))).json()).summary.ratings).toBe(0);
  await expect(assignment).toBeEnabled();await assignment.click();await admin.getByRole('combobox',{name:'Hledat: Učitel předmětu '+courseId,exact:true}).fill('Pan Učitel');await admin.getByRole('option',{name:'Pan Učitel',exact:true}).click();
  await expect.poll(async()=>(await(await teacher.request.get('/api/statistics?source=historical&subjectId='+encodeURIComponent(subject.id))).json()).summary.ratings).toBe(subject.ratings);
  const scoped=await (await teacher.request.get('/api/statistics?source=historical&subjectId='+encodeURIComponent(subject.id))).json();expect(scoped.scope).toBe('teacher');expect(scoped.summary.ratings).toBe(subject.ratings);expect(scoped.imports).toEqual([]);expect(scoped.canAssign).toBe(false);
  expect((await teacher.request.get('/api/statistics?organizationId=foreign')).status()).toBe(403);expect((await teacher.request.patch('/api/statistics/archive-courses/'+courseId,{data:{teacherId:owner.id}})).status()).toBe(403);
  await teacher.goto('/cs/statistics');await expect(teacher.getByRole('heading',{name:'Statistiky hodnocení'})).toBeVisible();await expect(teacher.getByRole('heading',{name:'Přiřazení archivních předmětů učitelům'})).toHaveCount(0);
  await admin.getByLabel('Rok předmětu').selectOption('2013');const filtered=await (await admin.request.get('/api/statistics?source=historical&year=2013')).json();await expect(admin.getByTestId('ratings-total')).toHaveText(filtered.summary.ratings.toLocaleString('cs'));expect(filtered.summary.years.every((r:{id:string})=>r.id==='2013')).toBe(true);
  await admin.setViewportSize({width:390,height:844});await admin.screenshot({path:testInfo.outputPath('historical-statistics-mobile.png'),fullPage:true});
  await login(student,'student1@desigator.cz','student123');expect((await student.request.get('/api/statistics')).status()).toBe(403);
 }finally{await Promise.all([adminContext.close(),teacherContext.close(),studentContext.close()]);}
});
test('current statistics count only the latest final version and retain that result under newer WIP',async({request})=>{
 const url=process.env.E2E_STATISTICS_DATABASE_URL||'';if(!/^\/desigator_organizations_(preview_test|test)$/.test(new URL(url).pathname)&&!(process.env.CI&&new URL(url).pathname==='/desigator_ci'))throw new Error('Requires isolated statistics database');const db=new PrismaClient({datasourceUrl:url});
 const teacher=await db.user.findUniqueOrThrow({where:{email:'teacher@desigator.cz'}}),student=await db.user.findUniqueOrThrow({where:{email:'student1@desigator.cz'}});const cls=await db.class.findFirstOrThrow({where:{organizationId:'legacy'}});
 const subject=await db.subject.create({data:{name:'Statistics versions '+Date.now(),year:2026,classId:cls.id,classes:{create:{classId:cls.id}},teacherId:teacher.id}});
 try{
  const task=await db.task.create({data:{title:'Version statistics',subjectId:subject.id,creatorId:teacher.id,maxPoints:10,status:'PUBLISHED'}});
  await db.submission.create({data:{taskId:task.id,studentId:student.id,version:1,stage:'FINAL',status:'EVALUATED',evaluations:{create:{evaluatorId:teacher.id,status:'COMPLETED',totalPoints:2}}}});
  const latest=await db.submission.create({data:{taskId:task.id,studentId:student.id,version:2,stage:'FINAL'}});
  const read=async()=>{const response=await request.get('/api/statistics?source=current&subjectId=current:'+subject.id);expect(response.status()).toBe(200);return(await response.json()).summary;};
  expect((await read()).ratings).toBe(0);
  await db.evaluation.create({data:{submissionId:latest.id,evaluatorId:teacher.id,status:'COMPLETED',totalPoints:8}});expect((await read()).averagePercent).toBe(80);
  await db.submission.create({data:{taskId:task.id,studentId:student.id,version:3,stage:'WIP'}});const summary=await read();expect(summary.ratings).toBe(1);expect(summary.works).toBe(1);expect(summary.averagePercent).toBe(80);
 }finally{await db.subject.delete({where:{id:subject.id}});await db.$disconnect();}
});
