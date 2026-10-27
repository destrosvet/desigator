import { describe, expect, it } from "vitest";
import { deadlineIso } from "@/lib/task-deadline";

describe("task deadline input", () => {
  it("uses 23:59 local time when only a date is entered", () => {
    expect(deadlineIso("2026-12-01", "")).toBe(new Date("2026-12-01T23:59").toISOString());
  });
  it("preserves an explicit time and allows no deadline", () => {
    expect(deadlineIso("2026-12-01", "14:30")).toBe(new Date("2026-12-01T14:30").toISOString());
    expect(deadlineIso("", "14:30")).toBeNull();
  });
});
