import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmail } from "@/lib/email-verification";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { passwordRequestAllowed } from "@/lib/password-route";
export async function POST(req: Request) {
  if (!passwordRequestAllowed(req)) return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  if (!consumeRateLimit("verify-email:" + getClientIp(req), 20, 900000).allowed) return NextResponse.json({ error: "Příliš mnoho pokusů." }, { status: 429 });
  try {
    const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(await req.json());
    if (!await verifyEmail(token)) return NextResponse.json({ error: "Odkaz je neplatný, již použitý nebo vypršel. Nechte si poslat nový." }, { status: 400 });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Ověření e-mailu selhalo." }, { status: 400 }); }
}
