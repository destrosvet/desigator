import { z } from "zod";
import { newPasswordSchema } from "@/lib/password-policy";
import { resetPassword } from "@/lib/passwords";
import { getClientIp } from "@/lib/rate-limit";
import { passwordFailure, passwordRateLimit, passwordRequestAllowed, passwordResponse } from "@/lib/password-route";
export async function POST(req: Request) {
  if (!passwordRequestAllowed(req)) return passwordResponse({ error: "invalidInput" }, 400);
  const limited = passwordRateLimit("reset-ip:" + getClientIp(req), 10);
  if (limited) return limited;
  try {
    const input = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: newPasswordSchema }).strict().parse(await req.json());
    await resetPassword(input.token, input.password);
    return passwordResponse({ message: "passwordReset" });
  } catch (error) { return passwordFailure(error); }
}
