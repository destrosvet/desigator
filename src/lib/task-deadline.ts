export function localDeadlineParts(value: string | null): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const parsed = new Date(value);
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

export function deadlineIso(date: string, time: string): string | null {
  if (!date) return null;
  return new Date(`${date}T${time || "23:59"}`).toISOString();
}
