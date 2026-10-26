import { z } from "zod";
// bcrypt uses at most 72 UTF-8 bytes. Reject longer input instead of truncating it.
export const newPasswordSchema = z.string().min(12).max(72).refine((value) => new TextEncoder().encode(value).length <= 72, "passwordTooLong");
export const emailSchema = z.string().trim().toLowerCase().max(254).email();
