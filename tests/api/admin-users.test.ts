import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  session: vi.fn(), users: vi.fn(), count: vi.fn(), user: vi.fn(), create: vi.fn(),
  organizations: vi.fn(), organization: vi.fn(), hash: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("bcryptjs", () => ({ default: { hash: m.hash } }));
vi.mock("@/lib/db", () => ({ db: {
  user: { findMany: m.users, count: m.count, findUnique: m.user, create: m.create },
  organization: { findMany: m.organizations, findUnique: m.organization },
} }));
import { GET, POST } from "@/app/api/admin/users/route";

const request = (data: unknown) => new Request("http://localhost/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
const evaluator = { name: "Externí hodnotitel", email: "reviewer@example.cz", role: "EVALUATOR", organizationId: null };

describe("user management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.session.mockResolvedValue({ user: { id: "admin", role: "ADMIN", roles: ["ADMIN"], organizationId: null } });
    m.users.mockResolvedValue([]); m.count.mockResolvedValue(0); m.organizations.mockResolvedValue([]);
    m.organization.mockResolvedValue({ id: "school" }); m.user.mockResolvedValue(null); m.hash.mockResolvedValue("hashed");
    m.create.mockImplementation(async ({ data }) => ({ id: "new", ...data, organization: null, createdAt: new Date(), isActive: true }));
  });

  it("rejects students and evaluators", async () => {
    m.session.mockResolvedValue({ user: { id: "student", role: "STUDENT", roles: ["STUDENT"], organizationId: "school" } });
    expect((await GET(new Request("http://localhost/api/admin/users"))).status).toBe(403);
    expect((await POST(request(evaluator))).status).toBe(403);
  });

  it("allows a teacher to create an external evaluator", async () => {
    m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER", roles: ["TEACHER"], organizationId: "school" } });
    const response = await POST(request(evaluator));
    expect(response.status).toBe(201);
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: "EVALUATOR", roles: ["EVALUATOR"], organizationId: null }) }));
    expect((await response.json()).tempPassword).toBeTypeOf("string");
  });

  it("does not allow a teacher to create another teacher", async () => {
    m.session.mockResolvedValue({ user: { id: "teacher", role: "TEACHER", roles: ["TEACHER"], organizationId: "school" } });
    const response = await POST(request({ ...evaluator, role: "TEACHER", organizationId: "school" }));
    expect(response.status).toBe(403); expect(m.create).not.toHaveBeenCalled();
  });

  it("requires an organization for a teacher account", async () => {
    const response = await POST(request({ ...evaluator, role: "TEACHER" }));
    expect(response.status).toBe(400); expect(m.create).not.toHaveBeenCalled();
  });

  it("creates teachers with evaluator permission", async () => {
    const response = await POST(request({ ...evaluator, role: "TEACHER", organizationId: "school" }));
    expect(response.status).toBe(201);
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ roles: ["TEACHER", "EVALUATOR"], organizationId: "school" }) }));
  });
});
