import { expect, test } from "@playwright/test";
import { teacherStatePath } from "./auth-setup";

test.skip(process.env.E2E_WORKFLOW !== "true", "Requires isolated demo database");
test("subject assignment includes future tasks and final submissions without per-work assignment", async ({ browser, baseURL }) => {
  const ownerContext = await browser.newContext({ baseURL, storageState: teacherStatePath });
  const reviewerContext = await browser.newContext({ baseURL });
  try {
    const owner = await ownerContext.newPage(); const reviewer = await reviewerContext.newPage();
    await reviewer.goto("/cs/auth/login"); await reviewer.getByLabel("E-mail", { exact: true }).fill("evaluator@desigator.cz"); await reviewer.getByLabel("Heslo", { exact: true }).fill("evaluator123"); await reviewer.getByRole("button", { name: /Přihlásit/ }).click(); await expect(reviewer).toHaveURL(/dashboard/);
    const { user } = await (await reviewer.request.get("/api/auth/session")).json();
    const { classes } = await (await owner.request.get("/api/classes")).json();
    const subjectResponse = await owner.request.post("/api/subjects", { data: { name: "Subject reviewers " + Date.now(), classId: classes[0].id, year: 2026 } });
    expect(subjectResponse.status()).toBe(201); const { subject } = await subjectResponse.json();
    const lookup = await owner.request.get(`/api/subjects/${subject.id}/evaluators?${new URLSearchParams({ search: user.email })}`);
    expect(lookup.status()).toBe(200);
    const candidate = (await lookup.json()).available.find((person: { id: string }) => person.id === user.id);
    expect(candidate.organization?.name).toBeTruthy();
    await owner.goto(`/cs/subjects/${subject.id}`);
    await owner.getByLabel("Vyhledat hodnotitele", { exact: true }).fill(candidate.organization.name);
    const results = owner.getByRole("list", { name: "Nalezení hodnotitelé" });
    await expect(results).toContainText(candidate.organization.name);
    await owner.getByLabel("Vyhledat hodnotitele", { exact: true }).fill(user.email);
    await expect(results).toContainText(user.email);
    await results.getByRole("button", { name: `Přiřadit ${user.name} k předmětu`, exact: true }).click();
    await expect(owner.getByRole("status")).toContainText("Hodnotitel byl přiřazen");
    const assigned = owner.getByRole("region", { name: "Přiřazení hodnotitelé" });
    await expect(assigned.getByRole("row").filter({ hasText: user.email })).toContainText(candidate.organization.name);
    await assigned.getByRole("button", { name: "Řadit podle: Organizace", exact: true }).click();
    await assigned.getByLabel("Hledat přiřazené hodnotitele", { exact: true }).fill(user.email);
    await assigned.getByRole("button", { name: "Hledat", exact: true }).click();
    await expect(assigned.getByRole("row").filter({ hasText: user.email })).toBeVisible();
    // Initial details and assigned reviewers are rendered on the server, without
    // client-side detail/classes/evaluator API waterfalls.
    const initialCalls: string[] = [];
    owner.on("request", request => { if (/\/api\/(subjects|classes)/.test(request.url())) initialCalls.push(request.url()); });
    await owner.reload();
    await expect(assigned.getByRole("row").filter({ hasText: user.email })).toBeVisible();
    expect(initialCalls).toEqual([]);
    expect((await reviewer.request.post(`/api/subjects/${subject.id}/evaluators`, { data: { evaluatorId: user.id } })).status()).toBe(403);
    const taskResponse = await owner.request.post("/api/tasks", { data: { title: "Future task " + Date.now(), subjectId: subject.id, maxPoints: 100, criteria: [{ name: "Provedení", maxPoints: 100 }] } });
    expect(taskResponse.status()).toBe(201); const { task } = await taskResponse.json();
    expect((await reviewer.request.get(`/api/tasks/${task.id}`)).status()).toBe(403);
    expect((await owner.request.patch(`/api/tasks/${task.id}`, { data: { status: "PUBLISHED" } })).ok()).toBeTruthy();
    await reviewer.goto(`/cs/evaluations?subjectId=${subject.id}`);
    await expect(reviewer.getByRole("heading", { name: task.title, exact: true })).toBeVisible();
    const { students } = await (await owner.request.get(`/api/submissions/bulk-upload?taskId=${task.id}`)).json();
    const author = students[0];
    const upload = await owner.request.post("/api/submissions/bulk-upload", { multipart: { taskId: task.id, stage: "FINAL", confirmed: "true", studentIds: JSON.stringify([author.id]), files: { name: author.externalId + ".png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=", "base64") } } });
    expect(upload.status()).toBe(200);
    await reviewer.goto("/cs/dashboard");
    await reviewer.getByRole("link", { name: "Předměty a zbývající hodnocení", exact: true }).click();
    await reviewer.getByRole("link").filter({ has: reviewer.getByRole("heading", { name: subject.name, exact: true }) }).click();
    const card = reviewer.getByRole("link").filter({ has: reviewer.getByRole("heading", { name: task.title, exact: true }) });
    await expect(card).toContainText("0 / 1 hodnocení dokončeno"); await card.click();
    const { evaluations } = await (await reviewer.request.get(`/api/evaluations?taskId=${task.id}`)).json();
    expect(evaluations).toHaveLength(1); expect(evaluations[0].evaluator.id).toBe(user.id);
    expect((await reviewer.request.patch(`/api/tasks/${task.id}`, { data: { title: "Forbidden" } })).status()).toBe(403);
    expect((await reviewer.request.patch(`/api/evaluations/${evaluations[0].id}`, { data: { status: "COMPLETED", scores: [{ criterionId: task.criteria[0].id, points: 80 }] } })).status()).toBe(200);
    await reviewer.goto(`/cs/evaluations?subjectId=${subject.id}`);
    await expect(reviewer.getByRole("link").filter({ has: reviewer.getByRole("heading", { name: task.title, exact: true }) })).toContainText("1 / 1 hodnocení dokončeno");
  } finally { await ownerContext.close(); await reviewerContext.close(); }
});
