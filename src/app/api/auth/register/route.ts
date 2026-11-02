import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { emailSchema, newPasswordSchema } from "@/lib/password-policy";
import { mailConfiguration } from "@/lib/transactional-email";
import { requestEmailVerification } from "@/lib/email-verification";
const registerSchema = z.object({ name: z.string().trim().min(2).max(200), email: emailSchema, password: newPasswordSchema, locale: z.enum(["cs", "en"]).default("cs") });
export async function POST(req: Request) {
  const limit = consumeRateLimit(`register:${getClientIp(req)}`, 5, 900000);
  if (!limit.allowed) return NextResponse.json({ error: "Příliš mnoho pokusů o registraci." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    const { name, email, password, locale } = registerSchema.parse(await req.json());
    try { mailConfiguration(); } catch { return NextResponse.json({ error: "Registrace není dostupná, protože nelze odeslat ověřovací e-mail." }, { status: 503 }); }
    if (await db.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ error: "Účet s tímto e-mailem již existuje. Přihlaste se nebo si nechte znovu poslat ověřovací e-mail." }, { status: 409 });
    await db.user.create({ data: { name, email, password: await bcrypt.hash(password, 12), role: "USER", roles: ["USER"], emailVerifiedAt: null }, select: { id: true } });
    try { await requestEmailVerification(email, locale); }
    catch { return NextResponse.json({ error: "Účet čeká na ověření, ale e-mail se nepodařilo odeslat. Použijte opětovné odeslání ověřovacího e-mailu.", verificationRequired: true }, { status: 503 }); }
    return NextResponse.json({ verificationRequired: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Zkontrolujte jméno, e-mail a heslo (alespoň 12 znaků, nejvýše 72 UTF-8 bajtů)." }, { status: 400 });
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "Účet s tímto e-mailem již existuje." }, { status: 409 });
    return NextResponse.json({ error: "Registrace selhala." }, { status: 500 });
  }
}
