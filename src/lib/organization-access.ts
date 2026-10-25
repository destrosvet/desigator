import { hasSchoolMembership, isAdmin, isSchoolAdmin, type PermissionUser } from "@/lib/permissions";
export function organizationTarget(user: PermissionUser, req: Request): string | null {
  const requested = new URL(req.url).searchParams.get("organizationId");
  if (requested) return isAdmin(user) || (hasSchoolMembership(user) && requested === user.organizationId) ? requested : null;
  return hasSchoolMembership(user) ? user.organizationId! : null;
}
export function canManageOrganization(user: PermissionUser, organizationId: string | null): boolean {
  return !!organizationId && (isAdmin(user) || (isSchoolAdmin(user) && user.organizationId === organizationId));
}
