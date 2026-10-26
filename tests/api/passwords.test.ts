import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), request: vi.fn(), reset: vi.fn(), change: vi.fn(), config: vi.fn(), limit: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/passwords", async (original) => { const actual = await original<typeof import("@/lib/passwords")>(); return { ...actual, requestPasswordReset: m.request, resetPassword: m.reset, changePassword: m.change }; });
vi.mock("@/lib/transactional-email", () => ({ mailConfiguration: m.config, sendPasswordResetEmail: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: m.limit, getClientIp: () => "test-ip" }));
import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { POST as reset } from "@/app/api/auth/reset-password/route";
import { POST as change } from "@/app/api/auth/change-password/route";
const req = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
describe("password API", () => {
 afterEach(() => vi.unstubAllEnvs());
 beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("APP_URL", "http://localhost"); m.limit.mockReturnValue({ allowed: true }); m.session.mockResolvedValue({ user: { id: "u1", sessionVersion: 2 } }); });
 it("returns the same uncached response even when delivery fails", async () => {
   const response = await forgot(req({ email: " User@Example.cz ", locale: "en" })); expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store"); expect(m.request).toHaveBeenCalledWith("user@example.cz", "en");
   const log = vi.spyOn(console, "error").mockImplementation(() => {}); m.request.mockRejectedValue(new Error("provider detail")); const failed = await forgot(req({ email: "missing@example.cz" })); expect(await failed.json()).toEqual(await response.json()); expect(log).toHaveBeenCalledWith("Password reset email delivery failed");
 });
 it("reports missing email configuration uniformly before account lookup", async () => { m.config.mockImplementation(() => { throw new Error(); }); expect((await forgot(req({ email: "user@example.cz" }))).status).toBe(503); expect(m.request).not.toHaveBeenCalled(); });
 it("rate limits public requests and returns Retry-After", async () => { m.limit.mockReturnValue({ allowed: false, retryAfter: 30 }); const response = await forgot(req({ email: "user@example.cz" })); expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("30"); expect(m.request).not.toHaveBeenCalled(); });
 it("hides account throttling behind the standard response", async () => { m.limit.mockReturnValueOnce({ allowed: true }).mockReturnValueOnce({ allowed: false, retryAfter: 30 }); expect((await forgot(req({ email: "user@example.cz" }))).status).toBe(200); expect(m.request).not.toHaveBeenCalled(); });
 it("requires an authenticated session for changing a password", async () => { m.session.mockResolvedValue(null); expect((await change(req({ currentPassword: "old", password: "new-password-123" }))).status).toBe(401); expect(m.change).not.toHaveBeenCalled(); });
 it("cannot choose another account in a change request", async () => { expect((await change(req({ currentPassword: "old", password: "new-password-123", userId: "someone-else" }))).status).toBe(400); expect(m.change).not.toHaveBeenCalled(); });
 it("rejects cross-origin cookie-authenticated requests", async () => { expect((await change(req({ currentPassword: "old", password: "new-password-123" }, "https://foreign.example"))).status).toBe(400); expect(m.change).not.toHaveBeenCalled(); });
 it("passes the session revision to the password transaction", async () => { expect((await change(req({ currentPassword: "old", password: "new-password-123" }))).status).toBe(200); expect(m.change).toHaveBeenCalledWith("u1", 2, "old", "new-password-123"); });
 it("rejects malformed token and oversized UTF-8 password before reset", async () => { expect((await reset(req({ token: "invalid", password: "new-password-123" }))).status).toBe(400); expect((await reset(req({ token: "a".repeat(64), password: "ž".repeat(37) }))).status).toBe(400); expect(m.reset).not.toHaveBeenCalled(); });
 it("accepts the public origin when the server uses an internal address", async () => {
   vi.stubEnv("APP_URL", "https://desigator.cz");
   expect((await change(req({ currentPassword: "old", password: "new-password-123" }, "https://desigator.cz"))).status).toBe(200);
 });

});
