import { z } from "zod";
import { emailSchema } from "@/lib/password-policy";
import { requestPasswordReset } from "@/lib/passwords";
import { mailConfiguration } from "@/lib/transactional-email";
import { getClientIp } from "@/lib/rate-limit";
import { passwordFailure, passwordRateLimit, passwordRequestAllowed, passwordResponse } from "@/lib/password-route";
const accepted = { message: "resetRequested" };
export async function POST(req: Request) {
  if (!passwordRequestAllowed(req)) return passwordResponse({ error: "invalidInput" }, 400);
  const limited = passwordRateLimit("forgot-ip:" + getClientIp(req), 10);
  if (limited) return limited;
  try {
    const input = z.object({ email: emailSchema, locale: z.enum(["cs", "en"]).default("cs") }).strict().parse(await req.json());
    try { mailConfiguration(); } catch { return passwordResponse({ error: "emailUnavailable" }, 503); }
    // Account throttling returns the same response, including for unknown/inactive users.
    if (!passwordRateLimit("forgot-account:" + input.email, 3)) {
      try { await requestPasswordReset(input.email, input.locale); }
      catch { console.error("Password reset email delivery failed"); }
    }
    return passwordResponse(accepted);
  } catch (error) { return passwordFailure(error); }
}
