import { afterEach, describe, expect, it, vi } from "vitest";
import { sendVerificationEmail } from "@/lib/transactional-email";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("verification email delivery", () => {
  it("uses the configured origin and keeps the secret in the URL fragment", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-key"); vi.stubEnv("RESEND_FROM", "Desigator <mail@example.test>"); vi.stubEnv("APP_URL", "https://example.test/");
    const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "mail-id" }) }); vi.stubGlobal("fetch", send);
    const token = "a".repeat(64); await sendVerificationEmail("user@example.test", token, "cs");
    expect(send.mock.calls[0][0]).toBe("https://api.resend.com/emails");
    const data = JSON.parse(send.mock.calls[0][1].body);
    expect(data.to).toEqual(["user@example.test"]); expect(data.text).toContain("https://example.test/cs/auth/verify-email#token=" + token);
    expect(data.text).toContain("24 hodin"); expect(data.subject).toContain("potvrďte");
  });
  it("does not report successful delivery when the provider rejects a message", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-key"); vi.stubEnv("RESEND_FROM", "mail@example.test"); vi.stubEnv("APP_URL", "https://example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(sendVerificationEmail("user@example.test", "a".repeat(64), "cs")).rejects.toThrow("delivery failed");
  });
});
