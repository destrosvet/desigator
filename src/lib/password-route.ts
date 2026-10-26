import { NextResponse } from "next/server";
import { z } from "zod";
import { PasswordError } from "@/lib/passwords";
import { consumeRateLimit } from "@/lib/rate-limit";
export function passwordResponse(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export function passwordRateLimit(key: string, limit: number) {
  const rate = consumeRateLimit(key, limit, 15 * 60 * 1000);
  return rate.allowed ? null : NextResponse.json({ error: "tooManyAttempts" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter), "Cache-Control": "no-store" } });
}
export function passwordFailure(error: unknown) {
  if (error instanceof PasswordError) return passwordResponse({ error: error.code }, error.status);
  if (error instanceof z.ZodError || error instanceof SyntaxError) return passwordResponse({ error: "invalidInput" }, 400);
  return passwordResponse({ error: "serverError" }, 500);
}
// Cookie-authenticated password changes only accept same-origin JSON requests.
export function passwordRequestAllowed(req: Request) {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.AUTH_URL || req.url).origin; } catch { return false; }
}
