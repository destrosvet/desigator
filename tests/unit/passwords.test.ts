import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ findAccount: vi.fn(), user: vi.fn(), update: vi.fn(), token: vi.fn(), create: vi.fn(), remove: vi.fn(), lock: vi.fn(), transaction: vi.fn(), send: vi.fn(), hash: vi.fn(), compare: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findFirst: m.findAccount }, passwordResetToken: { findUnique: m.token, deleteMany: m.remove }, $transaction: m.transaction } }));
vi.mock("@/lib/transactional-email", () => ({ sendPasswordResetEmail: m.send }));
vi.mock("bcryptjs", () => ({ default: { hash: m.hash, compare: m.compare } }));
import { requestPasswordReset, resetPassword, changePassword, hashResetToken } from "@/lib/passwords";
import { newPasswordSchema } from "@/lib/password-policy";
const account = { id: "u1", email: "user@example.cz", isActive: true, sessionVersion: 2, password: "old-hash" };
const validToken = { userId: "u1", expiresAt: new Date(Date.now() + 600000), sessionVersion: 2 };
describe("password lifecycle", () => {
 beforeEach(() => {
   vi.resetAllMocks(); m.findAccount.mockResolvedValue({ id: "u1" }); m.user.mockResolvedValue(account); m.token.mockResolvedValue(validToken); m.hash.mockResolvedValue("new-hash"); m.compare.mockResolvedValue(false); m.send.mockResolvedValue(undefined);
   m.transaction.mockImplementation(async run => run({ $queryRaw: m.lock, user: { findUnique: m.user, update: m.update }, passwordResetToken: { findUnique: m.token, create: m.create, deleteMany: m.remove } }));
 });
 it("stores only a hash of the single-use secret with a 30 minute expiry", async () => {
   await requestPasswordReset("user@example.cz", "en"); const raw = m.send.mock.calls[0][1]; expect(raw).toMatch(/^[a-f0-9]{64}$/);
   expect(m.create.mock.calls[0][0].data).toMatchObject({ tokenHash: hashResetToken(raw), userId: "u1", sessionVersion: 2 });
   expect(m.create.mock.calls[0][0].data.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60000); expect(m.remove).toHaveBeenCalledWith({ where: { userId: "u1" } });
 });
 it("does not send mail for an unknown or inactive account", async () => { m.findAccount.mockResolvedValue(null); await requestPasswordReset("missing@example.cz", "cs"); expect(m.send).not.toHaveBeenCalled(); });
 it("removes an undelivered token without invalidating a newer token", async () => {
   m.send.mockRejectedValue(new Error("Resend failure")); await expect(requestPasswordReset("user@example.cz", "cs")).rejects.toThrow(); expect(m.remove).toHaveBeenLastCalledWith({ where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) } });
 });
 it("resets a password, revokes all sessions and removes all reset links atomically", async () => {
   await resetPassword("a".repeat(64), "new-password-123"); expect(m.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { password: "new-hash", sessionVersion: { increment: 1 } } }); expect(m.remove).toHaveBeenCalledWith({ where: { userId: "u1" } }); expect(m.lock).toHaveBeenCalledOnce();
 });
 it.each([null, { ...validToken, expiresAt: new Date(0) }])("rejects unknown, used or expired tokens", async token => { m.token.mockResolvedValue(token); await expect(resetPassword("a".repeat(64), "new-password-123")).rejects.toMatchObject({ code: "invalidToken" }); expect(m.update).not.toHaveBeenCalled(); });
 it("rechecks token consumption after acquiring the user lock", async () => { m.token.mockResolvedValueOnce(validToken).mockResolvedValueOnce(null); await expect(resetPassword("a".repeat(64), "new-password-123")).rejects.toMatchObject({ code: "invalidToken" }); expect(m.update).not.toHaveBeenCalled(); });
 it("rejects tokens issued before a password change", async () => { m.user.mockResolvedValue({ ...account, sessionVersion: 3 }); await expect(resetPassword("a".repeat(64), "new-password-123")).rejects.toMatchObject({ code: "invalidToken" }); expect(m.update).not.toHaveBeenCalled(); });
 it("requires the current password and a current session", async () => { await expect(changePassword("u1", 2, "wrong", "new-password-123")).rejects.toMatchObject({ code: "wrongPassword" }); expect(m.update).not.toHaveBeenCalled(); await expect(changePassword("u1", 1, "old", "new-password-123")).rejects.toMatchObject({ code: "unauthorized" }); });
 it("changes a password and invalidates outstanding reset links", async () => { m.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false); await changePassword("u1", 2, "old", "new-password-123"); expect(m.update).toHaveBeenCalledOnce(); expect(m.remove).toHaveBeenCalledWith({ where: { userId: "u1" } }); });
 it("rejects an unchanged password", async () => { m.compare.mockResolvedValue(true); await expect(changePassword("u1", 2, "old", "old")).rejects.toMatchObject({ code: "samePassword" }); expect(m.update).not.toHaveBeenCalled(); });
 it("rejects bcrypt truncation, including multibyte passwords", () => { expect(newPasswordSchema.safeParse("a".repeat(12)).success).toBe(true); expect(newPasswordSchema.safeParse("short").success).toBe(false); expect(newPasswordSchema.safeParse("a".repeat(73)).success).toBe(false); expect(newPasswordSchema.safeParse("ž".repeat(37)).success).toBe(false); });
});
