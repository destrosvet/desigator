import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Healthcheck databáze
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          database: "disconnected",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
