import { describe, expect, it } from "vitest";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

describe("rate limiter", () => {
  it("allows requests up to the configured limit and then blocks", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(true);
    const blocked = consumeRateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("uses the first forwarded address", () => {
    const request = new Request("https://desigator.cz", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.2" },
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });
});