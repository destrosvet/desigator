import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: m.user } } }));
import { authOptions } from "@/lib/auth";
const callback = authOptions.callbacks!.jwt!;
const invoke = (token: object, user?: object) => callback({ token, user } as never);
describe("password session revocation", () => {
 beforeEach(() => { m.user.mockResolvedValue({ isActive: true, sessionVersion: 1, role: "STUDENT", roles: ["STUDENT"], organizationId: "school" }); });
 it("keeps the sign-in version and rejects earlier sessions", async () => {
   const token = await invoke({}, { id: "u1", role: "STUDENT", sessionVersion: 1 }); expect(token.active).toBe(true);
   expect((await invoke({ id: "u1", sessionVersion: 0 })).active).toBe(false);
   expect((await invoke({ id: "u1" })).active).toBe(false);
 });
 it("never refreshes a revoked version to make the session valid again", async () => { const token = await invoke({ id: "u1", sessionVersion: 0 }); const retry = await invoke(token); expect(retry.active).toBe(false); expect(retry.sessionVersion).toBe(0); });
 it("still reads role changes and blocks deactivated users", async () => { m.user.mockResolvedValue({ isActive: true, sessionVersion: 1, roles: ["EVALUATOR"], role: "EVALUATOR" }); expect((await invoke({ id: "u1", sessionVersion: 1 })).role).toBe("EVALUATOR"); m.user.mockResolvedValue({ isActive: false, sessionVersion: 1, roles: ["STUDENT"], role: "STUDENT" }); expect((await invoke({ id: "u1", sessionVersion: 1 })).active).toBe(false); });
});
