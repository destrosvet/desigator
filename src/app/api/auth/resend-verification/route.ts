import { NextResponse } from "next/server";
import { z } from "zod";
import { requestEmailVerification } from "@/lib/email-verification";
import { emailSchema } from "@/lib/password-policy";
import { mailConfiguration } from "@/lib/transactional-email";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { passwordRequestAllowed } from "@/lib/password-route";
export async function POST(req: Request) {
  if (!passwordRequestAllowed(req)) return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  if (!consumeRateLimit("verify-resend-ip:" + getClientIp(req), 10, 900000).allowed) return NextResponse.json({ error: "Příliš mnoho pokusů." }, { status: 429 });
  try {
    const input = z.object({ email: emailSchema, locale: z.enum(["cs", "en"]).default("cs") }).strict().parse(await req.json());
    try { mailConfiguration(); } catch { return NextResponse.json({ error: "Odesílání e-mailů není dostupné." }, { status: 503 }); }
    if (consumeRateLimit("verify-resend-account:" + input.email, 3, 900000).allowed) await requestEmailVerification(input.email, input.locale);
    return NextResponse.json({ message: "Pokud účet čeká na ověření, poslali jsme nový odkaz." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? "Neplatný e-mail." : "E-mail se nepodařilo odeslat. Zkuste to později." }, { status: error instanceof z.ZodError ? 400 : 503 }); }
}
