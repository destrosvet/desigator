import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { isAdmin, isSchoolAdmin, hasRole, primaryRole, canEvaluate, hasSchoolMembership, showSchoolWorkspace, showPersonalTemplates } from "@/lib/permissions";
import { managedClassScope, managedTaskScope, visibleTaskScope } from "@/lib/authorization";
import { evaluationScope } from "@/lib/evaluations";
import { schoolRolesSchema } from "@/lib/organizations";
import { planStudentImport } from "@/lib/student-import";
const combined = { id: "teacher", role: "TEACHER", roles: ["SCHOOL_ADMIN", "TEACHER", "EVALUATOR"], organizationId: "school-a" };
describe("school permissions", () => {
  it("combines independent permissions without platform administrator access", () => {
    expect(isSchoolAdmin(combined)).toBe(true); expect(isAdmin(combined)).toBe(false);
    expect(hasRole(combined, "EVALUATOR")).toBe(true);
    expect(managedClassScope(combined)).toEqual({ organizationId: "school-a" });
    expect(managedTaskScope(combined)).toEqual({ subject: { class: { organizationId: "school-a" } } });
  });
  it("does not treat a pure platform administrator as a school member", () => {
    const admin = { id: "platform", role: "ADMIN", roles: ["ADMIN"], organizationId: "legacy" };
    expect(isAdmin(admin)).toBe(true); expect(hasSchoolMembership(admin)).toBe(false);
    expect(showSchoolWorkspace(admin)).toBe(false); expect(showPersonalTemplates(admin)).toBe(false);
    expect(managedTaskScope(admin)).toEqual({});
  });
  it("supports platform administration combined with school administration and teaching", () => {
    const admin = { ...combined, role: "ADMIN", roles: ["ADMIN", ...combined.roles] };
    expect(primaryRole(admin.roles)).toBe("ADMIN"); expect(isAdmin(admin)).toBe(true);
    expect(isSchoolAdmin(admin)).toBe(true); expect(hasSchoolMembership(admin)).toBe(true);
    expect(showSchoolWorkspace(admin)).toBe(true); expect(showPersonalTemplates(admin)).toBe(true);
    expect(managedClassScope(admin)).toEqual({});
  });
  it("keeps a teacher's ownership restriction inside the home school", () => {
    expect(managedTaskScope({ ...combined, roles: ["TEACHER", "EVALUATOR"] })).toEqual({ creatorId: "teacher", subject: { class: { organizationId: "school-a" } } });
  });
  it("fails closed for an account without a school", () => {
    expect(managedClassScope({ id: "teacher", role: "TEACHER" })).toMatchObject({ organizationId: "__no_organization__" });
    expect(managedClassScope({ ...combined, role: "EVALUATOR", roles: ["EVALUATOR"] })).toEqual({ id: { in: [] } });
  });
  it("adds assigned cross-school works to teachers' visibility", () => {
    expect(JSON.stringify(visibleTaskScope(combined))).toContain('"evaluatorId":"teacher"');
    expect(JSON.stringify(evaluationScope(combined))).toContain('"evaluatorId":"teacher"');
  });
  it("uses the explicit role array as authority and permits a standalone school administrator", () => {
    const admin = { ...combined, role: "ADMIN", roles: ["SCHOOL_ADMIN"] };
    expect(isAdmin(admin)).toBe(false); expect(isSchoolAdmin(admin)).toBe(true);
    expect(primaryRole(admin.roles)).toBe("TEACHER");
  });
  it("does not retain cross-school assignments after rating permission is revoked", () => {
    const user = { ...combined, roles: ["TEACHER"] };
    expect(canEvaluate(user)).toBe(false);
    expect(JSON.stringify(visibleTaskScope(user))).not.toContain("evaluatorId");
    expect(JSON.stringify(evaluationScope(user))).not.toContain("evaluatorId");
  });
  it("rejects platform role escalation and mixed student/staff invitations", () => {
    expect(schoolRolesSchema.safeParse(["ADMIN"]).success).toBe(false);
    expect(schoolRolesSchema.safeParse(["STUDENT", "TEACHER"]).success).toBe(false);
    expect(schoolRolesSchema.safeParse(combined.roles).success).toBe(true);
  });
  it("does not attach students from a different school during import", () => {
    const result = planStudentImport([{ row: 1, name: "Student", email: "s@example.test", externalId: "123" }], [{ id: "s", name: "Student", email: "s@example.test", externalId: "123", role: "STUDENT", isActive: true, organizationId: "school-b", classMemberships: [] }], "class-a", "school-a");
    expect(result[0].action).toBe("error"); expect(result[0].studentId).toBeNull();
  });
});
