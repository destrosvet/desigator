import { describe, expect, it } from "vitest";
import { MODEL_MIME_TYPE, normalizeModelFile, validateGlb } from "@/lib/model-files";
import { glbFixture } from "../helpers/media-fixtures";
describe("self-contained GLB uploads", () => {
 it("accepts a complete GLB with a mesh and embedded animation", () => expect(validateGlb(glbFixture())).toBeNull());
 it("rejects malformed headers, truncated chunks, and unsupported versions", () => {
  const valid = glbFixture();
  for (const value of [Buffer.from("not a model"), valid.subarray(0, valid.length - 1)]) expect(validateGlb(value)).toBeTruthy();
  const version = Buffer.from(valid); version.writeUInt32LE(1, 4); expect(validateGlb(version)).toBeTruthy();
 });
 it("rejects external texture and buffer requests and compressed decoder formats", () => {
  for (const overrides of [{ buffers: [{ uri: "https://example.com/model.bin" }] }, { images: [{ uri: "/private/texture.png" }] }, { images: [{ uri: "data:image/svg+xml;base64,PHN2Zz4=" }] }, { extensionsUsed: ["KHR_draco_mesh_compression"] }, { extensionsRequired: ["EXT_meshopt_compression"] }, { extensionsUsed: ["KHR_texture_basisu"] }]) expect(validateGlb(glbFixture(overrides))).toBeTruthy();
 });
 it("normalizes browser MIME types only for GLB filenames", () => {
  const file = normalizeModelFile(new File([glbFixture()], "work.GLB", { type: "application/octet-stream" })); expect(file.type).toBe(MODEL_MIME_TYPE); expect(file.name).toBe("work.GLB");
  expect(normalizeModelFile(new File(["x"], "x.html", { type: "text/html" })).type).toBe("text/html");
  expect(normalizeModelFile(new File(["x"], "x.glb", { type: "text/html" })).type).toBe("text/html");
 });
});
