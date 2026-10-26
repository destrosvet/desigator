import { beforeEach, describe, expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { $queryRaw: query } }));
import { GET } from "@/app/api/health/route";
describe("public health endpoint", () => {
 beforeEach(() => vi.resetAllMocks());
 it("reports a live database without caching", async () => { query.mockResolvedValue([{ value: 1 }]); const response = await GET(); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); expect((await response.json()).services.database).toBe("connected"); });
 it("returns 503 without disclosing internal connection errors", async () => { query.mockRejectedValue(new Error("postgresql://secret:password@private-db:5432/internal")); const response = await GET(); expect(response.status).toBe(503); const body = await response.json(); expect(body.status).toBe("unhealthy"); expect(body.error).toBeUndefined(); expect(JSON.stringify(body)).not.toContain("private-db"); });
});
