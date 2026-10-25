import { uploadFileSizeLimit } from "@/lib/media";
import { describe, expect, it } from "vitest";
import { extractStudentId, suggestStudent } from "@/lib/import-matching";
describe("school ID filename matching", () => {
 it("separates a numeric school ID from the view number", () => { expect(extractStudentId("4464341_02.jpg")).toBe("4464341"); expect(extractStudentId("4464341.jpg")).toBe("4464341"); });
 it("does not accept a partial ID or ambiguous match", () => { const students = [{ id: "a", externalId: "4464341" }]; expect(suggestStudent("4464_02.jpg", students)).toBe(""); expect(suggestStudent("4464341_02.jpg", [...students, { id: "b", externalId: "4464341" }])).toBe(""); });
 it("supports school IDs without case-sensitive guessing", () => { expect(suggestStudent("s001_detail.jpg", [{ id: "a", externalId: "S001" }])).toBe("a"); expect(extractStudentId("4464341_02,jpg")).toBeNull(); });
});

it("allows 100 MB only for MP4 and retains 25 MB for other formats", () => {
  expect(uploadFileSizeLimit("video/mp4")).toBe(100 * 1024 * 1024);
  expect(uploadFileSizeLimit("video/webm")).toBe(25 * 1024 * 1024);
  expect(uploadFileSizeLimit("image/jpeg")).toBe(25 * 1024 * 1024);
});
