export type TableSort = { key: string; direction: "asc" | "desc" } | null;
export type SortValue = string | number | null | undefined;
const collator = new Intl.Collator("cs", { numeric: true, sensitivity: "base" });
export function surnameSortKey(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts.at(-1)} ${parts.slice(0, -1).join(" ")}` : parts[0] || "";
}
export function sortTableRows<T>(rows: T[], sort: TableSort, value: (row: T, key: string) => SortValue): T[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const left = value(a, sort.key); const right = value(b, sort.key);
    // Empty values stay at the end in either direction.
    if (left == null || left === "") return right == null || right === "" ? 0 : 1;
    if (right == null || right === "") return -1;
    const result = typeof left === "number" && typeof right === "number" ? left - right : collator.compare(String(left), String(right));
    return sort.direction === "asc" ? result : -result;
  });
}
export function readTableSort(params: URLSearchParams, keys: string[]): TableSort {
  const key = params.get("sort");
  return key && keys.includes(key) ? { key, direction: params.get("order") === "desc" ? "desc" : "asc" } : null;
}
