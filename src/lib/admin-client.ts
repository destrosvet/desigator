export async function mutateAdminRows(entity: "students" | "subjects" | "tasks", ids: string[], status?: "DRAFT" | "PUBLISHED" | "CLOSED") {
  const response = await fetch("/api/admin/" + entity + "/bulk", { method: status ? "PATCH" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, confirmed: true, ...(status ? { status } : {}) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Operace selhala.");
  return data as { count: number };
}
