import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({ session: vi.fn(), attachment: vi.fn(), canRead: vi.fn(), getFile: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { attachment: { findUnique: mocks.attachment } } }));
vi.mock("@/lib/authorization", () => ({ canReadAttachment: mocks.canRead }));
vi.mock("@/lib/s3", () => ({ getFile: mocks.getFile }));
import { GET } from "@/app/api/uploads/[...path]/route";

function request(query = "") { return GET(new Request(`http://localhost/api/uploads/file-1${query}`), { params: Promise.resolve({ path: ["file-1"] }) }); }

describe("private work previews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ user: { id: "reviewer", role: "EVALUATOR" } });
    mocks.attachment.mockResolvedValue({ id: "file-1", s3Key: "private/file.png", originalName: "návrh.png", mimeType: "image/png" });
    mocks.canRead.mockResolvedValue(true);
  });

  it("denies anonymous and unauthorized previews before accessing storage", async () => {
    mocks.session.mockResolvedValueOnce(null);
    expect((await request("?thumbnail=1")).status).toBe(401);
    mocks.canRead.mockResolvedValueOnce(false);
    expect((await request("?preview=1")).status).toBe(403);
    expect(mocks.getFile).not.toHaveBeenCalled();
  });

  it("does not serve active or unsupported formats inline", async () => {
    mocks.attachment.mockResolvedValueOnce({ id: "file-1", s3Key: "private/file.svg", originalName: "file.svg", mimeType: "image/svg+xml" });
    expect((await request("?preview=1")).status).toBe(415);
    expect(mocks.getFile).not.toHaveBeenCalled();
  });

  it("creates a bounded WebP thumbnail and preserves private cache headers", async () => {
    mocks.getFile.mockResolvedValue(await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#e56335" } }).png().toBuffer());
    const response = await request("?thumbnail=1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("content-disposition")).toMatch(/^inline;/);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(metadata.width).toBe(640);
    expect(metadata.height).toBe(480);
  });

  it("serves PDFs inline only after authorization with private headers and byte ranges", async () => {
    mocks.attachment.mockResolvedValue({ id: "file-1", s3Key: "private/work.pdf", originalName: "work.pdf", mimeType: "application/pdf" });
    mocks.getFile.mockResolvedValue(Buffer.from("%PDF-1.7 test"));
    const response = await request("?preview=1");
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await request("?thumbnail=1")).status).toBe(415);
    const partial = await GET(new Request("http://localhost/api/uploads/file-1?preview=1", { headers: { Range: "bytes=0-3" } }), { params: Promise.resolve({ path: ["file-1"] }) });
    expect(partial.status).toBe(206); expect(await partial.text()).toBe("%PDF"); expect(partial.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    const download = await request(); expect(download.headers.get("content-disposition")).toMatch(/^attachment;/);
  });

  it("keeps original downloads byte-for-byte without changing disposition", async () => {
    const original = Buffer.from("original content");
    mocks.getFile.mockResolvedValue(original);
    const response = await request();
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename\*=UTF-8''/);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(original);
  });
  it("serves private video byte ranges and rejects invalid ranges", async () => {
    mocks.attachment.mockResolvedValue({ id: "file-1", s3Key: "private/clip.webm", originalName: "clip.webm", mimeType: "video/webm" });
    mocks.getFile.mockResolvedValue(Buffer.from("0123456789"));
    const response = await GET(new Request("http://localhost/api/uploads/file-1?preview=1", { headers: { Range: "bytes=2-5" } }), { params: Promise.resolve({ path: ["file-1"] }) });
    expect(response.status).toBe(206); expect(response.headers.get("Content-Range")).toBe("bytes 2-5/10"); expect(await response.text()).toBe("2345"); expect(response.headers.get("cache-control")).toBe("private, no-store");
    const invalid = await GET(new Request("http://localhost/api/uploads/file-1?preview=1", { headers: { Range: "bytes=99-" } }), { params: Promise.resolve({ path: ["file-1"] }) });
    expect(invalid.status).toBe(416);
    expect((await request("?thumbnail=1")).status).toBe(415);
  });

});
