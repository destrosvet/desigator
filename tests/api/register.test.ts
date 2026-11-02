import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
  mail: vi.fn(), config: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}));
vi.mock("bcryptjs", () => ({
  default: { hash: mocks.hash },
}));
vi.mock("@/lib/transactional-email", () => ({ mailConfiguration: mocks.config }));
vi.mock("@/lib/email-verification", () => ({ requestEmailVerification: mocks.mail }));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hashed");
    mocks.create.mockResolvedValue({ id: "user-1", name: "Student", email: "student@example.cz", role: "STUDENT" });
  });

  it("always creates an unverified basic user even if privileged roles or an organization are supplied", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}` },
      body: JSON.stringify({ name: "Student", email: "student@example.cz", password: "Strong-secret123", role: "ADMIN", roles: ["TEACHER"], organizationName: "Injected school" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { name: "Student", email: "student@example.cz", password: "hashed", role: "USER", roles: ["USER"], emailVerifiedAt: null },
    }));
    expect(mocks.mail).toHaveBeenCalledWith("student@example.cz", "cs");
  });

  it("rejects duplicate email addresses", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing" });
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200)}` },
      body: JSON.stringify({ name: "Student", email: "student@example.cz", password: "Strong-secret123" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not create accounts if email delivery is not configured", async () => {
    mocks.config.mockImplementation(() => { throw new Error("not configured"); });
    const response = await POST(new Request("http://localhost/api/auth/register", { method: "POST", headers: { "x-forwarded-for": "no-mail-register" }, body: JSON.stringify({ name: "User", email: "user@example.cz", password: "Strong-secret123" }) }));
    expect(response.status).toBe(503); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("keeps a pending account unusable and offers resend if delivery fails", async () => {
    mocks.mail.mockRejectedValue(new Error("delivery failed"));
    const response = await POST(new Request("http://localhost/api/auth/register", { method: "POST", headers: { "x-forwarded-for": "failed-mail-register" }, body: JSON.stringify({ name: "User", email: "user@example.cz", password: "Strong-secret123" }) }));
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ verificationRequired: true });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ emailVerifiedAt: null }) }));
  });
});
