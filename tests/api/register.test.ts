import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}));
vi.mock("bcryptjs", () => ({
  default: { hash: mocks.hash },
}));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hashed");
    mocks.create.mockResolvedValue({ id: "user-1", name: "Student", email: "student@example.cz", role: "STUDENT" });
  });

  it("always creates a student even if an admin role is supplied", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}` },
      body: JSON.stringify({ name: "Student", email: "student@example.cz", password: "secret123", role: "ADMIN" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: "STUDENT" }),
    }));
  });

  it("rejects duplicate email addresses", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing" });
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200)}` },
      body: JSON.stringify({ name: "Student", email: "student@example.cz", password: "secret123" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});