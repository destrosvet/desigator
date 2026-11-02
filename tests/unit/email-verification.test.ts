import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), upsert: vi.fn(), remove: vi.fn(), update: vi.fn(), send: vi.fn(), raw: vi.fn() }));
vi.mock("@/lib/transactional-email", () => ({ sendVerificationEmail: m.send }));
vi.mock("@/lib/db", () => {
  const tx = { $queryRaw: m.raw, user: { findUnique: m.user, update: m.update }, emailVerificationToken: { findUnique: m.token, upsert: m.upsert, deleteMany: m.remove } };
  return { db: { ...tx, $transaction: (fn: (tx: unknown) => unknown) => fn(tx) } };
});
import { requestEmailVerification, verificationHash, verifyEmail } from "@/lib/email-verification";
describe("email verification", () => {
  beforeEach(() => { vi.resetAllMocks(); m.user.mockResolvedValue({ id: "user", email: "test@example.cz", isActive: true, emailVerifiedAt: null }); m.token.mockResolvedValue({ userId: "user", expiresAt: new Date(Date.now() + 100000) }); });
  it("stores only a hash and sends a fresh 24-hour secret to the account address", async () => {
    await requestEmailVerification("test@example.cz", "cs");
    const token = m.send.mock.calls[0][1]; expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId: "user", tokenHash: verificationHash(token), expiresAt: expect.any(Date) } }));
    expect(JSON.stringify(m.upsert.mock.calls)).not.toContain(token);
  });
  it("verifies once and consumes every token for the account", async () => {
    expect(await verifyEmail("a".repeat(64))).toBe(true);
    expect(m.update).toHaveBeenCalledWith({ where: { id: "user" }, data: { emailVerifiedAt: expect.any(Date) } });
    expect(m.remove).toHaveBeenCalledWith({ where: { userId: "user" } });
  });
  it("rejects expired, consumed, and disabled account tokens", async () => {
    m.token.mockResolvedValue({ userId: "user", expiresAt: new Date(0) }); expect(await verifyEmail("a".repeat(64))).toBe(false);
    m.token.mockResolvedValue(null); expect(await verifyEmail("a".repeat(64))).toBe(false);
    m.token.mockResolvedValue({ userId: "user", expiresAt: new Date(Date.now() + 100000) }); m.user.mockResolvedValue({ id: "user", isActive: false });
    expect(await verifyEmail("a".repeat(64))).toBe(false); expect(m.update).not.toHaveBeenCalled();
  });
  it("rechecks the token after locking to prevent concurrent replay", async () => {
    m.token.mockResolvedValueOnce({ userId: "user" }).mockResolvedValue(null);
    expect(await verifyEmail("a".repeat(64))).toBe(false); expect(m.update).not.toHaveBeenCalled();
  });
  it("removes an undelivered token without verifying the account", async () => {
    m.send.mockRejectedValue(new Error("delivery failed")); await expect(requestEmailVerification("test@example.cz", "cs")).rejects.toThrow();
    expect(m.remove).toHaveBeenCalledWith({ where: { tokenHash: expect.any(String) } }); expect(m.update).not.toHaveBeenCalled();
  });
  it("does not send verification emails for verified or missing accounts", async () => {
    m.user.mockResolvedValue({ id: "user", isActive: true, emailVerifiedAt: new Date() }); await requestEmailVerification("test@example.cz", "cs");
    m.user.mockResolvedValue(null); await requestEmailVerification("unknown@example.cz", "cs"); expect(m.send).not.toHaveBeenCalled();
  });
});
