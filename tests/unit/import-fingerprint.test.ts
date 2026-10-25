import { describe, expect, it } from "vitest";
import { importFingerprint } from "@/lib/import-fingerprint";
const file = (content = "one", name = "view.jpg") => new File([content], name, { type: "image/jpeg" });
describe("batch identity", () => {
 it("ignores file ordering but includes author, stage and exact content", async () => {
   const a = file(); const b = file("two", "other.jpg");
   expect(await importFingerprint("FINAL", [a, b], ["s1", "s2"])).toBe(await importFingerprint("FINAL", [b, a], ["s2", "s1"]));
   const original = await importFingerprint("FINAL", [a], ["s1"]);
   expect(original).not.toBe(await importFingerprint("WIP", [a], ["s1"]));
   expect(original).not.toBe(await importFingerprint("FINAL", [a], ["s2"]));
   expect(original).not.toBe(await importFingerprint("FINAL", [file("two")], ["s1"]));
 });
});
