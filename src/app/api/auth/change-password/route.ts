import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { newPasswordSchema } from "@/lib/password-policy";
import { changePassword } from "@/lib/passwords";
import { passwordFailure, passwordRateLimit, passwordRequestAllowed, passwordResponse } from "@/lib/password-route";
export async function POST(req: Request) {
  if (!passwordRequestAllowed(req)) return passwordResponse({ error: "invalidInput" }, 400);
  const session = await getServerSession(authOptions);
  if (!session) return passwordResponse({ error: "unauthorized" }, 401);
  const limited = passwordRateLimit("change-password:" + session.user.id, 5);
  if (limited) return limited;
  try {
    const input = z.object({ currentPassword: z.string().min(1).max(1024), password: newPasswordSchema }).strict().parse(await req.json());
    await changePassword(session.user.id, session.user.sessionVersion ?? 0, input.currentPassword, input.password);
    return passwordResponse({ message: "passwordChanged" });
  } catch (error) { return passwordFailure(error); }
}
