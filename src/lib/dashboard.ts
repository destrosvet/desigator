import { db } from "@/lib/db";
import { managedClassScope, managedTaskScope, visibleClassScope, visibleTaskScope, type AuthUser } from "@/lib/authorization";
import { evaluationScope } from "@/lib/evaluations";
import { canEvaluate, canTeach } from "@/lib/permissions";

export async function getDashboard(user: AuthUser) {
 const student = user.role === "STUDENT";
 const reviewer = !student && !canTeach(user);
 const tasks = visibleTaskScope(user);
 const reviews = evaluationScope(user);
 const ownWork = { studentId: user.id, task: tasks };
 const [first, taskCount, pending, fourth, recentTasks, recentWorks] = await Promise.all([
  student ? db.submission.count({ where: ownWork }) : reviewer ? db.evaluation.count({ where: reviews }) : db.user.count({ where: { role: "STUDENT", classMemberships: { some: { class: managedClassScope(user) } } } }),
  db.task.count({ where: tasks }),
  student ? db.submission.count({ where: { ...ownWork, stage: "FINAL", resultsPublishedAt: { not: null } } }) : db.evaluation.count({ where: { AND: [reviews, { status: { in: ["PENDING", "IN_PROGRESS"] } }] } }),
  reviewer ? db.evaluation.count({ where: { AND: [reviews, { status: "COMPLETED" }] } }) : db.class.count({ where: visibleClassScope(user) }),
  db.task.findMany({ where: tasks, select: { id: true, title: true, status: true, deadline: true, subject: { select: { name: true } } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 6 }),
  db.submission.findMany({ where: student ? ownWork : { OR: [{ task: managedTaskScope(user) }, ...(canEvaluate(user) ? [{ evaluations: { some: { evaluatorId: user.id } } }] : [])] }, select: { id: true, taskId: true, studentId: true, version: true, stage: true, submittedAt: true, task: { select: { title: true } }, student: { select: { name: true } }, evaluations: { where: { evaluatorId: user.id, status: { in: ["PENDING", "IN_PROGRESS"] }, submission: { stage: "FINAL", resultsPublishedAt: null } }, select: { id: true }, take: 1 } }, orderBy: [{ submittedAt: "desc" }, { id: "desc" }], take: 6 }),
 ]);
 return { student, reviewer, counts: [first, taskCount, pending, fourth], recentTasks, recentWorks: recentWorks.map(({ evaluations, ...work }) => ({ ...work, reviewId: !student && canEvaluate(user) ? evaluations[0]?.id : undefined })) };
}
