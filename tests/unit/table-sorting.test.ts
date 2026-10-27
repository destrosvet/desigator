import { describe, expect, it } from "vitest";
import { readTableSort, sortTableRows, surnameSortKey } from "@/lib/table-sorting";
describe("table ordering", () => {
  it("orders Czech text and numeric portions without mutating source rows", () => {
    const rows = ["Žák 10", "Adam", "Žák 2", "Černý", "Chalupa"];
    expect(sortTableRows(rows, { key: "name", direction: "asc" }, (item) => item)).toEqual(["Adam", "Černý", "Chalupa", "Žák 2", "Žák 10"]);
    expect(rows[0]).toBe("Žák 10");
  });
  it("orders numbers numerically and leaves empty values last in both directions", () => {
    const rows = [null, 100, 2, 12, null];
    expect(sortTableRows(rows, { key: "points", direction: "asc" }, (item) => item)).toEqual([2, 12, 100, null, null]);
    expect(sortTableRows(rows, { key: "points", direction: "desc" }, (item) => item)).toEqual([100, 12, 2, null, null]);
  });
  it("ignores unknown sort fields and restricts direction", () => {
    expect(readTableSort(new URLSearchParams("sort=password&order=desc"), ["name"])).toBeNull();
    expect(readTableSort(new URLSearchParams("sort=name&order=invalid"), ["name"])).toEqual({ key: "name", direction: "asc" });
  });
  it("places Czech Š between S and T rather than after Z", () => {
    const rows = ["Zeman", "Šimek", "Tichý", "Svoboda"];
    expect(sortTableRows(rows, { key: "surname", direction: "asc" }, (item) => item)).toEqual(["Svoboda", "Šimek", "Tichý", "Zeman"]);
  });
  it("derives a Czech list key from the final surname part", () => {
    expect(surnameSortKey("Jana Nováková")).toBe("Nováková Jana");
    expect(surnameSortKey("  Petr   Černý  ")).toBe("Černý Petr");
    expect(surnameSortKey("Madonna")).toBe("Madonna");
  });
});
