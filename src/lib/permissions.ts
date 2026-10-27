// This module is also safe to use in client components and middleware.
export type PermissionUser = { id: string; role: string; roles?: string[]; organizationId?: string | null };
export function rolesOf(user: Pick<PermissionUser, "role" | "roles">): string[] {
  return user.roles?.length ? user.roles : [user.role];
}
export function hasRole(user: Pick<PermissionUser, "role" | "roles">, role: string): boolean { return rolesOf(user).includes(role); }
export function isAdmin(user: PermissionUser): boolean { return hasRole(user, "ADMIN"); }
export function isSchoolAdmin(user: PermissionUser): boolean { return !!user.organizationId && hasRole(user, "SCHOOL_ADMIN"); }
export function canTeach(user: PermissionUser): boolean { return isAdmin(user) || isSchoolAdmin(user) || hasRole(user, "TEACHER"); }
export function anonymousEvaluation(user: PermissionUser): boolean { return hasRole(user, "EVALUATOR") && !canTeach(user); }
export function primaryRole(roles: string[]): string {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("TEACHER") || roles.includes("SCHOOL_ADMIN")) return "TEACHER";
  if (roles.includes("EVALUATOR")) return "EVALUATOR";
  return "STUDENT";
}
// Missing school membership must never become an unrestricted filter.
export function schoolId(user: PermissionUser): string { return user.organizationId || "__no_organization__"; }

export function canEvaluate(user: PermissionUser): boolean { return isAdmin(user) || hasRole(user, "EVALUATOR") || (!user.roles?.length && user.role === "TEACHER"); }

// Global administration is not membership in a school, even with an old organizationId.
export function hasSchoolMembership(user: PermissionUser): boolean {
  return !!user.organizationId && rolesOf(user).some((role) => ["SCHOOL_ADMIN", "TEACHER", "EVALUATOR", "STUDENT"].includes(role));
}
export function showSchoolWorkspace(user: PermissionUser): boolean {
  return !isAdmin(user) || hasSchoolMembership(user);
}
export function showPersonalTemplates(user: PermissionUser): boolean {
  return hasRole(user, "TEACHER") || isSchoolAdmin(user);
}
