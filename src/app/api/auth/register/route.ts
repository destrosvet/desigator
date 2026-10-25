import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(2, "Jméno musí mít alespoň 2 znaky"),
  email: z.string().email("Neplatný email"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
});

export async function POST(req: Request) {
  try {
  const rateLimit = consumeRateLimit(`register:${getClientIp(req)}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
    );
  }

    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Uživatel s tímto emailem již existuje" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "STUDENT",
        roles: ["STUDENT"],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registrace selhala" },
      { status: 500 }
    );
  }
}
