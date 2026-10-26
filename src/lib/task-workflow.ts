export type WorkStudent = { id: string; name: string; email: string };
export type WorkVersion = {
  resultsPublishedAt?: string | null; resultsPublishedById?: string | null;
  id: string; version: number; stage: "WIP" | "FINAL"; changeNote: string | null; uploadedById: string | null;
  content: string | null; status: string; submittedAt: string; student: WorkStudent;
  attachments: Array<{ id: string; originalName: string; size: number; s3Url: string; mimeType: string }>;
  evaluations: Array<{ id: string; status: string; totalPoints: number | null; feedback?: string | null; evaluator: { name: string } }>;
};
export type TaskContext = {
 id: string; title: string; description: string | null; instructions: string | null; maxPoints: number;
 deadline: string | null; status: string; subject: { name: string; class: { name: string } };
 criteria: Array<{ id: string; name: string; description: string | null; maxPoints: number }>;
};
export function studentWorkRows(students: WorkStudent[], submissions: WorkVersion[]) {
 const roster = new Map(students.map((student) => [student.id, student]));
 for (const work of submissions) roster.set(work.student.id, work.student);
 return [...roster.values()].map((student) => {
  const versions = submissions.filter((work) => work.student.id === student.id).sort((a, b) => b.version - a.version);
  return { ...student, latest: versions[0] || null, versionCount: versions.length };
 }).sort((a, b) => a.name.localeCompare(b.name, "cs"));
}
