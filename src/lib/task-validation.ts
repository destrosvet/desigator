import { z } from "zod";

export const criterionInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Vyplňte název kritéria.").max(200),
  description: z.string().max(2000).nullable().optional(),
  maxPoints: z.number().int().min(1).max(10000),
});
export const criteriaInputSchema = z.array(criterionInputSchema).max(50).superRefine((criteria, ctx) => {
  const names = criteria.map((item) => item.name.toLocaleLowerCase());
  const ids = criteria.flatMap((item) => item.id ? [item.id] : []);
  if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", message: "Názvy kritérií musí být jedinečné." });
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Kritérium lze uvést pouze jednou." });
});
export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(20000).nullable().optional(),
  instructions: z.string().max(20000).nullable().optional(),
  maxPoints: z.number().int().min(1).max(10000).optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional(),
  criteria: criteriaInputSchema.optional(),
});
export function rubricError(criteria: Array<{ maxPoints: number }>, maxPoints: number, requireCriteria = false): string | null {
  if (!criteria.length) return requireCriteria ? "Před publikováním přidejte alespoň jedno hodnoticí kritérium." : null;
  return criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0) === maxPoints ? null : "Součet bodů kritérií musí odpovídat maximu zadání.";
}
