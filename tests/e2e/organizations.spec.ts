import { expect, test, type BrowserContext, type Page } from "@playwright/test";
test.skip(process.env.E2E_ORGANIZATIONS !== "true", "Requires an isolated organization test database");
async function registerAndLogin(page: Page, email: string) {
  const response = await page.request.post("/api/auth/register", { data: { name: email.split("@")[0], email, password: "OrganizationTest123!" } });
  expect(response.status()).toBe(201);
  const user = (await response.json()).user;
  await page.goto("/cs/auth/login");
  await page.getByLabel(/e-mail/i).fill(email); await page.getByLabel(/heslo/i).fill("OrganizationTest123!");
  await page.getByRole("button", { name: /přihlásit/i }).click(); await page.waitForURL(/dashboard/);
  return user;
}
async function createSchool(page: Page, name: string) {
  await page.goto("/cs/settings?section=school");
  await page.getByLabel("Název nové školy").fill(name); await page.getByRole("button", { name: "Založit školu", exact: true }).click();
  await expect(page.getByText("Školní oprávnění:", { exact: false })).toContainText("Správce školy, Učitel, Hodnotitel");
  return (await (await page.request.get("/api/organization")).json()).organization;
}
test("schools isolate data while combined roles and cross-school evaluator assignments work", async ({ browser, baseURL }) => {
  test.setTimeout(180000);
  const contexts: BrowserContext[] = [];
  const make = async () => { const context = await browser.newContext({ baseURL }); contexts.push(context); return context.newPage(); };
  try {
    const a = await make(), b = await make(), teacher = await make(), student = await make();
    const suffix = Date.now();
    const aUser = await registerAndLogin(a, "founder-a-" + suffix + "@example.test");
    const bUser = await registerAndLogin(b, "founder-b-" + suffix + "@example.test");
    const teacherEmail = "teacher-" + suffix + "@example.test";
    const teacherUser = await registerAndLogin(teacher, teacherEmail);
    const studentEmail = "student-" + suffix + "@example.test";
    const studentUser = await registerAndLogin(student, studentEmail);
    const schoolA = await createSchool(a, "Škola A " + suffix);
    const schoolB = await createSchool(b, "Škola B " + suffix);
    expect(schoolA.id).not.toBe(schoolB.id);
    const lastAdmin = await a.request.patch("/api/organization/members/" + aUser.id, { data: { roles: ["TEACHER", "EVALUATOR"] } });
    expect(lastAdmin.status()).toBe(409);
    expect((await b.request.patch("/api/organization/members/" + aUser.id, { data: { roles: ["SCHOOL_ADMIN"] } })).status()).toBe(403);
    const escalation = await a.request.post("/api/organization/invitations", { data: { email: teacherEmail, roles: ["ADMIN"] } });
    expect(escalation.status()).toBe(400);
    await a.getByRole("button", { name: "Pozvat člena", exact: true }).click();
    await a.getByLabel("E-mail pozvaného").fill(teacherEmail);
    await a.getByRole("button", { name: "Vytvořit pozvánku", exact: true }).click();
    const link = await a.getByLabel("Odkaz pozvánky").inputValue(); const token = link.split("/").pop();
    expect((await b.request.post("/api/organization/invitations/accept", { data: { token } })).status()).toBe(403);
    await teacher.goto(link); await teacher.getByRole("button", { name: "Přijmout pozvánku" }).click(); await teacher.waitForURL(/settings/); await teacher.goto("/cs/settings?section=school");
    await expect(teacher.getByText("Školní oprávnění:", { exact: false })).toContainText("Učitel, Hodnotitel");
    expect((await teacher.request.post("/api/organization/invitations/accept", { data: { token } })).status()).toBe(403);
    expect((await teacher.request.post("/api/organization/invitations", { data: { email: "x@example.test", roles: ["SCHOOL_ADMIN"] } })).status()).toBe(403);
    // Existing teacher sessions receive role changes without signing in again.
    expect((await a.request.patch("/api/organization/members/" + teacherUser.id, { data: { roles: ["SCHOOL_ADMIN", "TEACHER", "EVALUATOR"] } })).ok()).toBe(true);
    expect((await (await teacher.request.get("/api/organization")).json()).canManage).toBe(true);
    expect((await a.request.patch("/api/organization/members/" + teacherUser.id, { data: { roles: ["TEACHER", "EVALUATOR"] } })).ok()).toBe(true);
    expect((await (await teacher.request.get("/api/organization")).json()).canManage).toBe(false);
    const invite = await a.request.post("/api/organization/invitations", { data: { email: studentEmail, roles: ["STUDENT"] } });
    const studentToken = (await invite.json()).token;
    expect((await student.request.post("/api/organization/invitations/accept", { data: { token: studentToken } })).ok()).toBe(true);
    const clsResponse = await a.request.post("/api/classes", { data: { name: "Třída A" } }); expect(clsResponse.status()).toBe(201);
    const cls = (await clsResponse.json()).class;
    expect(cls.organizationId).toBe(schoolA.id);
    expect((await student.request.post("/api/classes/join", { data: { code: cls.code } })).status()).toBe(201);
    const subject = (await (await a.request.post("/api/subjects", { data: { name: "Design A", classId: cls.id, year: 2026 } })).json()).subject;
    const createTask = async (title: string) => {
      const response = await a.request.post("/api/tasks", { data: { title, subjectId: subject.id, maxPoints: 10, criteria: [{ name: "Návrh", maxPoints: 10 }] } });
      expect(response.status()).toBe(201); const task = (await response.json()).task;
      expect((await a.request.patch("/api/tasks/" + task.id, { data: { status: "PUBLISHED" } })).ok()).toBe(true); return task;
    };
    const task = await createTask("Přiřazená práce A"), hiddenTask = await createTask("Nepřiřazené zadání A");
    expect((await b.request.get("/api/tasks/" + task.id)).status()).toBe(403);
    const submissionResponse = await student.request.post("/api/submissions", { multipart: { taskId: task.id, content: "Studentský návrh pro test škol", stage: "FINAL" } }); expect(submissionResponse.status()).toBe(201);
    const submission = (await submissionResponse.json()).submission;
    const assignmentResponse = await a.request.post("/api/evaluations", { data: { submissionId: submission.id, evaluatorId: bUser.id } }); expect(assignmentResponse.status()).toBe(201);
    const evaluation = (await assignmentResponse.json()).evaluation;
    expect((await b.request.get("/api/tasks/" + task.id)).status()).toBe(200);
    expect((await b.request.get("/api/tasks/" + hiddenTask.id)).status()).toBe(403);
    expect((await b.request.get("/api/classes/" + cls.id)).status()).toBe(404);
    expect((await b.request.patch("/api/tasks/" + task.id, { data: { title: "Cizí změna" } })).status()).toBe(403);
    expect((await teacher.request.patch("/api/tasks/" + task.id, { data: { title: "Cizí změna" } })).status()).toBe(403);
    const clsBResponse = await b.request.post("/api/classes", { data: { name: "Třída B" } }); expect(clsBResponse.status()).toBe(201);
    const clsB = (await clsBResponse.json()).class;
    expect((await student.request.post("/api/classes/join", { data: { code: clsB.code } })).status()).toBe(403);
    expect((await b.request.post("/api/classes/" + clsB.id + "/students", { data: { studentId: studentUser.id } })).status()).toBe(404);
    const studentBResponse = await b.request.post("/api/students", { data: { name: "Student školy B", email: "student-b-" + suffix + "@example.test", password: "OrganizationTest123!" } }); expect(studentBResponse.status()).toBe(201);
    const studentB = (await studentBResponse.json()).student;
    expect((await a.request.patch("/api/students/" + studentUser.id, { data: { name: "Student A", email: studentEmail, externalId: "SAME001" } })).status()).toBe(200);
    expect((await b.request.patch("/api/students/" + studentB.id, { data: { name: "Student B", email: studentB.email, externalId: "SAME001" } })).status()).toBe(200);
    const foreignImport = await b.request.post("/api/classes/" + clsB.id + "/students/import", { data: { rows: [{ row: 1, name: "Student A", email: studentEmail, externalId: "OTHER001" }] } });
    expect((await foreignImport.json()).rows[0].action).toBe("error");
    const foreignSubject = await (await b.request.get("/api/subjects/" + subject.id)).json();
    expect(foreignSubject.subject.tasks.map((item: { id: string }) => item.id)).toEqual([task.id]);
    expect((await (await b.request.get("/api/students")).json()).students.map((item: { id: string }) => item.id)).toEqual([studentB.id]);
    expect((await (await b.request.get("/api/organization")).json()).members.some((member: { id: string }) => member.id === studentUser.id)).toBe(false);
    await b.goto("/cs/evaluations/" + evaluation.id); await expect(b.getByText("Přiřazená práce A", { exact: false }).first()).toBeVisible();
    const grade = await b.request.patch("/api/evaluations/" + evaluation.id, { data: { status: "COMPLETED", scores: [{ criterionId: task.criteria[0].id, points: 8 }], feedback: "Hodnocení z jiné školy" } }); expect(grade.status()).toBe(200);
    expect((await student.request.get("/api/evaluations/" + evaluation.id)).status()).toBe(404);
    expect((await b.request.patch("/api/submissions/" + submission.id + "/publication", { data: { published: true } })).status()).toBe(403);
    expect((await a.request.patch("/api/submissions/" + submission.id + "/publication", { data: { published: true } })).status()).toBe(200);
    expect((await (await student.request.get("/api/evaluations/" + evaluation.id)).json()).evaluation.totalPoints).toBe(8);
    // A school administrator can manage their school without being a teacher or evaluator.
    expect((await b.request.patch("/api/organization/members/" + bUser.id, { data: { roles: ["SCHOOL_ADMIN"] } })).status()).toBe(200);
    expect((await (await b.request.get("/api/organization")).json()).canManage).toBe(true);
    expect((await b.request.get("/api/classes/" + clsB.id)).status()).toBe(200);
    expect((await b.request.get("/api/tasks/" + task.id)).status()).toBe(403);
    expect((await b.request.patch("/api/evaluations/" + evaluation.id, { data: { status: "COMPLETED", scores: [{ criterionId: task.criteria[0].id, points: 1 }] } })).status()).toBe(403);
    // Staff cannot be moved to another home school by invitation.
    const foreignInvite = await a.request.post("/api/organization/invitations", { data: { email: bUser.email, roles: ["TEACHER"] } });
    expect((await b.request.post("/api/organization/invitations/accept", { data: { token: (await foreignInvite.json()).token } })).status()).toBe(409);
  } finally { await Promise.all(contexts.map((context) => context.close())); }
});
