export function extractStudentId(filename: string): string | null {
  const match = filename.match(/^(\d+)/);
  return match?.[1] ?? null;
}

export function suggestStudent(filename: string, students: Array<{ id: string; externalId: string | null }>): string {
  const id = extractStudentId(filename);
  const matches = students.filter((student) => id && student.externalId?.toUpperCase() === id);
  return matches.length === 1 ? matches[0].id : "";
}
