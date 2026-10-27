export type TableSort = { key: string; direction: "asc" | "desc" } | null;
export type SortValue = string | number | null | undefined;
const czechKey = (value: string) => value.toLocaleLowerCase("cs").replaceAll("ch", "h~").replace(/[áä]/g, "a").replace(/č/g, "c~").replace(/ď/g, "d~").replace(/é/g, "e").replace(/ě/g, "e~").replace(/í/g, "i").replace(/ň/g, "n~").replace(/ó/g, "o").replace(/ř/g, "r~").replace(/š/g, "s~").replace(/ť/g, "t~").replace(/[úů]/g, "u").replace(/ý/g, "y").replace(/ž/g, "z~");
function compareCzech(left: string, right: string): number {
  const a = czechKey(left).split(/(\d+)/); const b = czechKey(right).split(/(\d+)/);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const x = a[index] || ""; const y = b[index] || "";
    if (x === y) continue;
    if (/^\d+$/.test(x) && /^\d+$/.test(y)) return Number(x) - Number(y);
    return x < y ? -1 : 1;
  }
  return 0;
}
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
    const result = typeof left === "number" && typeof right === "number" ? left - right : compareCzech(String(left), String(right));
    return sort.direction === "asc" ? result : -result;
  });
}
export function readTableSort(params: URLSearchParams, keys: string[]): TableSort {
  const key = params.get("sort");
  return key && keys.includes(key) ? { key, direction: params.get("order") === "desc" ? "desc" : "asc" } : null;
}
