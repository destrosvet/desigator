export type TableEntity = "users" | "organizations" | "classes" | "students" | "subjects" | "tasks" | "templates" | "attachments" | "members" | "work-students";
export type EditField = { key: string; label: string; type?: "text" | "number" | "boolean" | "select"; options?: { value: string; label: string }[] };
export type TableManagement = { entity: TableEntity; fields: EditField[]; contextId?: string; onSaved: () => void | Promise<void> };
export const activeField: EditField = { key: "isActive", label: "Stav účtu", type: "boolean" };
export const institutionField: EditField = { key: "institution", label: "Instituce v profilu" };
export const semesterField: EditField = { key: "semester", label: "Semestr", type: "select", options: [{ value: "FULL_YEAR", label: "Celoroční" }, { value: "SUMMER", label: "Letní" }, { value: "WINTER", label: "Zimní" }] };
export async function manageTableRows(entity: TableEntity, ids: string[], data?: Record<string, unknown>, contextId?: string) {
  const response = await fetch(`/api/table-records/${entity}`, { method: data ? "PATCH" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, confirmed: true, ...(data ? { data } : {}), ...(contextId ? { contextId } : {}) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Operace selhala.");
  return result;
}
