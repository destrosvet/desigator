import { z } from "zod";
export const schoolRolesSchema = z.array(z.enum(["SCHOOL_ADMIN", "TEACHER", "EVALUATOR", "STUDENT"])).min(1).max(4).transform((roles) => [...new Set(roles)]).refine((roles) => !roles.includes("STUDENT") || roles.length === 1, "Studentské oprávnění nelze kombinovat se správou nebo hodnocením.");
export class OrganizationError extends Error { constructor(message: string, public status = 409) { super(message); } }
