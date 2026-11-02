import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), actor: vi.fn(), users: vi.fn(), count: vi.fn(), updateUsers: vi.fn(), deleteUsers: vi.fn(), organizations: vi.fn(), updateOrganizations: vi.fn(), deleteOrganizations: vi.fn(), classes: vi.fn(), updateClasses: vi.fn(), deleteClasses: vi.fn(), subjects: vi.fn(), updateSubjects: vi.fn(), tasks: vi.fn(), updateTasks: vi.fn(), members: vi.fn(), templates: vi.fn(), updateTemplates: vi.fn(), attachments: vi.fn(), updateAttachments: vi.fn(), works: vi.fn(), updateWorks: vi.fn(), deleteWorks: vi.fn(), raw: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { $transaction: async (fn: (tx: unknown) => unknown) => fn({
  $queryRaw: m.raw,
  user: { findUnique: m.actor, findMany: m.users, count: m.count, update: m.members, updateMany: m.updateUsers, deleteMany: m.deleteUsers },
  organization: { findMany: m.organizations, updateMany: m.updateOrganizations, deleteMany: m.deleteOrganizations },
  class: { findMany: m.classes, updateMany: m.updateClasses, deleteMany: m.deleteClasses },
  subject: { findMany: m.subjects, updateMany: m.updateSubjects },
  task: { findMany: m.tasks, findFirst: m.tasks, updateMany: m.updateTasks },
  assignmentTemplate: { findMany: m.templates, updateMany: m.updateTemplates },
  attachment: { findMany: m.attachments, updateMany: m.updateAttachments },
  submission: { findMany: m.works, updateMany: m.updateWorks, deleteMany: m.deleteWorks },
}) } }));
import { PATCH, DELETE } from "@/app/api/table-records/[entity]/route";
const admin = { id: "admin", role: "ADMIN", roles: ["ADMIN"], isActive: true, organizationId: null };
const teacher = { id: "teacher", role: "TEACHER", roles: ["TEACHER"], isActive: true, organizationId: "school" };
const member = { id: "one", role: "TEACHER", roles: ["TEACHER"], isActive: true, organizationId: "school", legacyId: null, _count: {} };
function request(entity: string, data?: object, ids = ["one"], confirmed = true) {
  const remove = data === undefined;
  return (remove ? DELETE : PATCH)(new Request("http://localhost/api/table-records/" + entity, { method: remove ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, confirmed, ...(data ? { data } : {}), contextId: "school" }) }), { params: Promise.resolve({ entity }) });
}
describe("table management authorization and atomic batches", () => {
  beforeEach(() => {
    vi.resetAllMocks(); m.session.mockResolvedValue({ user: admin }); m.actor.mockResolvedValue(admin); m.count.mockResolvedValue(0);
    for (const fn of [m.updateUsers, m.deleteUsers, m.updateOrganizations, m.deleteOrganizations, m.updateClasses, m.deleteClasses, m.updateSubjects, m.updateTasks, m.members, m.updateTemplates, m.updateAttachments, m.updateWorks, m.deleteWorks]) fn.mockResolvedValue({ count: 1 });
    m.users.mockResolvedValue([member]); m.organizations.mockResolvedValue([{ id: "one", _count: {} }]); m.classes.mockResolvedValue([{ id: "one", _count: {} }]); m.subjects.mockResolvedValue([{ id: "one" }]); m.tasks.mockResolvedValue([{ id: "one", criteria: [], maxPoints: 100 }]); m.templates.mockResolvedValue([{ id: "one" }]); m.attachments.mockResolvedValue([{ id: "one" }]);
  });
  it.each(["organizations", "users", "classes", "subjects", "tasks", "students", "templates", "attachments", "members", "work-students"])("rejects anonymous and evaluator mutation of %s", async (entity) => {
    m.session.mockResolvedValue(null); expect((await request(entity, {})).status).toBe(403);
    m.session.mockResolvedValue({ user: { ...teacher, role: "EVALUATOR", roles: ["EVALUATOR"] } }); expect((await request(entity)).status).toBe(403);
  });
  it("rejects invalid, duplicate, oversized and unconfirmed batches", async () => {
    for (const ids of [[], ["one", "one"], Array.from({ length: 101 }, (_, i) => String(i))]) expect((await request("users", { isActive: true }, ids)).status).toBe(400);
    expect((await request("users", { isActive: true }, ["one"], false)).status).toBe(400);
    expect(m.updateUsers).not.toHaveBeenCalled();
  });
  it("rejects privilege injection and empty updates", async () => {
    for (const data of [{ roles: ["ADMIN"] }, { organizationId: "foreign" }, { password: "bad" }, {}]) expect((await request("users", data)).status).toBe(400);
  });
  it("rejects a partial authorization match without writing anything", async () => {
    expect((await request("subjects", { year: 2027 }, ["one", "foreign"])).status).toBe(403); expect(m.updateSubjects).not.toHaveBeenCalled();
  });
  it("scopes teacher class changes by school and ownership", async () => {
    m.session.mockResolvedValue({ user: teacher }); m.actor.mockResolvedValue(teacher);
    expect((await request("classes", { academicYear: 2027 })).status).toBe(200);
    expect(m.classes).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["one"] }, organizationId: "school", teacherId: "teacher" } }));
  });
  it("does not allow teachers to create organization edits", async () => {
    m.session.mockResolvedValue({ user: teacher }); m.actor.mockResolvedValue(teacher);
    expect((await request("organizations", { name: "New school" })).status).toBe(403);
  });
  it("scopes teacher user updates to their own students", async () => {
    m.session.mockResolvedValue({ user: teacher }); m.actor.mockResolvedValue(teacher);
    expect((await request("users", { institution: "School" })).status).toBe(200);
    expect(m.users).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ id: { in: ["one"] } }, expect.objectContaining({ role: "STUDENT", organizationId: "school", classMemberships: { some: { class: { teacherId: "teacher", organizationId: "school" } } } })] } }));
    expect((await request("users", { isActive: false })).status).toBe(403);
  });
  it("never deletes the acting administrator", async () => {
    m.users.mockResolvedValue([{ ...admin, _count: {} }]); expect((await request("users", undefined, ["admin"])).status).toBe(409);
    expect(m.deleteUsers).not.toHaveBeenCalled();
  });
  it("blocks deletion of accounts and organizations with history", async () => {
    m.users.mockResolvedValue([{ ...member, _count: { submissions: 1 } }]); expect((await request("users")).status).toBe(409);
    m.organizations.mockResolvedValue([{ id: "one", _count: { historicalImports: 1 } }]); expect((await request("organizations")).status).toBe(409);
    expect(m.deleteUsers).not.toHaveBeenCalled(); expect(m.deleteOrganizations).not.toHaveBeenCalled();
  });
  it("prevents removing all school administrators in a single batch", async () => {
    m.users.mockResolvedValue([{ ...member, roles: ["SCHOOL_ADMIN"] }]);
    expect((await request("users", { isActive: false })).status).toBe(409);
    expect((await request("members", { roles: ["TEACHER"] })).status).toBe(409);
    expect((await request("members")).status).toBe(409); expect(m.members).not.toHaveBeenCalled();
  });
  it("revokes sessions when deactivating accounts", async () => {
    expect((await request("users", { isActive: false })).status).toBe(200);
    expect(m.updateUsers).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: false, sessionVersion: { increment: 1 } } }));
  });
  it("only deletes empty classes", async () => {
    m.classes.mockResolvedValue([{ id: "one", _count: { students: 1 } }]); expect((await request("classes")).status).toBe(409);
    m.classes.mockResolvedValue([{ id: "one", _count: {} }]); expect((await request("classes")).status).toBe(200);
  });
  it("blocks invalid publication rubrics", async () => {
    m.tasks.mockResolvedValue([{ id: "one", criteria: [{ name: "A", maxPoints: 10 }], maxPoints: 100 }]);
    expect((await request("tasks", { status: "PUBLISHED" })).status).toBe(409); expect(m.updateTasks).not.toHaveBeenCalled();
  });
  it("limits template edits to the teacher's own templates", async () => {
    m.session.mockResolvedValue({ user: teacher }); m.actor.mockResolvedValue(teacher);
    expect((await request("templates", { instructions: "New instructions" })).status).toBe(200);
    expect(m.templates).toHaveBeenCalledWith({ where: { id: { in: ["one"] }, creatorId: "teacher" }, select: { id: true } });
  });
  it("rejects attachment header injection", async () => {
    expect((await request("attachments", { originalName: "x\r\nHeader: value" })).status).toBe(400);
  });
  it("blocks mixed work selections with missing submissions", async () => {
    m.tasks.mockResolvedValue({ id: "school", status: "PUBLISHED", maxPoints: 100, resultsPublishedAt: null }); m.works.mockResolvedValue([]);
    expect((await request("work-students", { published: true })).status).toBe(409); expect(m.updateWorks).not.toHaveBeenCalled();
  });
});
