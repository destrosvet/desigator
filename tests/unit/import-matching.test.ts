import { anonymousAttachmentName, uploadFileSizeLimit } from "@/lib/media";
import { describe, expect, it } from "vitest";
import { extractStudentId, suggestStudent } from "@/lib/import-matching";
describe("school ID filename matching", () => {
 it("reads the leading numeric school ID up to the first non-digit", () => { expect(extractStudentId("4464341_02.jpg")).toBe("4464341"); expect(extractStudentId("4464341.jpg")).toBe("4464341"); expect(extractStudentId("4464341 - pohled.jpg")).toBe("4464341"); expect(extractStudentId("4464341-detail.png")).toBe("4464341"); expect(extractStudentId("4464341(2).webp")).toBe("4464341"); });
 it("does not accept a partial ID or ambiguous match", () => { const students = [{ id: "a", externalId: "4464341" }]; expect(suggestStudent("4464_02.jpg", students)).toBe(""); expect(suggestStudent("4464341_02.jpg", [...students, { id: "b", externalId: "4464341" }])).toBe(""); });
 it("only matches a numeric sequence at the start of the filename", () => { expect(extractStudentId("student-4464341.jpg")).toBeNull(); expect(extractStudentId("S001_detail.jpg")).toBeNull(); expect(suggestStudent("4464341 libovolný popis.jpg", [{ id: "a", externalId: "4464341" }])).toBe("a"); });
});

it("allows 100 MB only for MP4 and retains 25 MB for other formats", () => {
  expect(uploadFileSizeLimit("video/mp4")).toBe(100 * 1024 * 1024);
  expect(uploadFileSizeLimit("video/webm")).toBe(25 * 1024 * 1024);
  expect(uploadFileSizeLimit("image/jpeg")).toBe(25 * 1024 * 1024);
});

it("removes student identifiers from attachment names shown during evaluation", () => {
  expect(anonymousAttachmentName("4464341 Jan Novak pohled.JPG", 1)).toBe("Příloha 2.jpg");
});
