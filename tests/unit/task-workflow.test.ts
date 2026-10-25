import { describe, expect, it } from "vitest";
import { studentWorkRows, type WorkVersion } from "@/lib/task-workflow";
const anna = { id: "a", name: "Anna", email: "anna@example.test" };
const adam = { id: "b", name: "Adam", email: "adam@example.test" };
function work(version: number, stage: "WIP" | "FINAL"): WorkVersion { return { id: "v" + version, version, stage, student: anna, content: null, changeNote: null, uploadedById: "a", status: "SUBMITTED", submittedAt: "2026-10-21T12:00:00Z", attachments: [], evaluations: [] }; }
describe("one student work per class task", () => {
 it("counts several revisions as one student and includes students who have not submitted", () => { const rows = studentWorkRows([anna, adam], [work(1, "WIP"), work(3, "WIP"), work(2, "FINAL")]); expect(rows).toHaveLength(2); expect(rows.find((row) => row.id === "a")).toMatchObject({ versionCount: 3, latest: { version: 3, stage: "WIP" } }); expect(rows.find((row) => row.id === "b")).toMatchObject({ versionCount: 0, latest: null }); });
 it("keeps the original author visible after they leave the class", () => { expect(studentWorkRows([adam], [work(1, "FINAL")]).map((row) => row.id).sort()).toEqual(["a", "b"]); });
});
