export function extractStudentId(filename: string): string | null {
  const stem = filename.replace(/\.[^.]+$/, "");
  const match = stem.match(/^([a-z0-9]+)(?:[_-][a-z0-9_-]+)?$/i);
  return match?.[1].toUpperCase() ?? null;
}

export function suggestStudent(filename: string, students: Array<{ id: string; externalId: string | null }>): string {
  const id = extractStudentId(filename);
  const matches = students.filter((student) => id && student.externalId?.toUpperCase() === id);
  return matches.length === 1 ? matches[0].id : "";
}
