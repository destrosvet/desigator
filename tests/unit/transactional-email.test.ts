import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mailConfiguration, sendPasswordResetEmail } from "@/lib/transactional-email";
describe("Resend transactional email", () => {
 beforeEach(() => { vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("RESEND_FROM", "Desigator <mail@example.cz>"); vi.stubEnv("APP_URL", "https://app.example.cz"); });
 afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
 it("sends a plain-text localized single-use link to the configured public origin", async () => {
   const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "mail-id" }), { status: 200 })); vi.stubGlobal("fetch", fetcher);
   await sendPasswordResetEmail("user@example.cz", "a".repeat(64), "en");
   expect(fetcher).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer test-key" }) }));
   const data = JSON.parse(fetcher.mock.calls[0][1].body); expect(data.to).toEqual(["user@example.cz"]); expect(data.text).toContain("https://app.example.cz/en/auth/reset-password#token=" + "a".repeat(64)); expect(data.text).toContain("30 minutes");
 });
 it("treats provider errors as failure instead of claiming delivery", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 }))); await expect(sendPasswordResetEmail("user@example.cz", "a".repeat(64), "cs")).rejects.toThrow("Email delivery failed"); });
 it("requires mail credentials and a public HTTPS URL in production", () => { vi.stubEnv("RESEND_API_KEY", ""); expect(() => mailConfiguration()).toThrow(); vi.stubEnv("RESEND_API_KEY", "test"); vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("APP_URL", "http://example.cz"); expect(() => mailConfiguration()).toThrow(); });
});
