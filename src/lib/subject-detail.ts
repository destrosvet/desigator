import { db } from "@/lib/db";
import { visibleSubjectScope, visibleTaskScope, type AuthUser } from "@/lib/authorization";
import { canTeach, isAdmin, isSchoolAdmin } from "@/lib/permissions";

export const subjectEvaluatorSelection = { id: true, name: true, email: true, institution: true, organization: { select: { name: true } } } as const;

export function removableSubjectReviews(subjectId: string) {
  return { submission: { task: { subjectId, resultsPublishedAt: null }, resultsPublishedAt: null }, status: "PENDING" as const, totalPoints: null, evaluatedAt: null, OR: [{ feedback: null }, { feedback: "" }], scores: { none: {} } };
}

export async function standaloneSubjectReviewers(subjectId: string) {
  const reviewers = await db.user.findMany({
    where: { evaluatedSubjects: { none: { subjectId } }, evaluations: { some: { submission: { task: { subjectId } } } } },
    select: subjectEvaluatorSelection,
    orderBy: { name: "asc" },
  });
  return reviewers.map(reviewer => ({ ...reviewer, standalone: true }));
}

export async function readSubjectDetail(user: AuthUser, id: string) {
  const subject = await db.subject.findFirst({
    where: { id, ...visibleSubjectScope(user) },
    select: {
      id: true, code: true, name: true, description: true, semester: true, year: true, teacherId: true, publicResultsEnabled: true,
      classes: { select: { classId: true, class: { select: { id: true, name: true, organizationId: true } } }, orderBy: { class: { name: "asc" } } },
      teacher: { select: { id: true, name: true } },
      tasks: { where: visibleTaskScope(user), select: { id: true, title: true, maxPoints: true, status: true, createdAt: true, creatorId: true }, orderBy: { createdAt: "desc" } },
      evaluators: { where: canTeach(user) ? {} : { evaluatorId: { in: [] } }, select: { evaluator: { select: subjectEvaluatorSelection } }, orderBy: { evaluator: { name: "asc" } } },
    },
  });
  if (!subject) return null;
  const sameSchool = subject.classes.some(link => link.class.organizationId === user.organizationId);
  const managesSchool = sameSchool && isSchoolAdmin(user);
  const canManage = isAdmin(user) || (canTeach(user) && sameSchool && (managesSchool || subject.teacherId === user.id));
  const missingExternalIds = canManage ? await db.classStudent.count({ where: { classId: { in: subject.classes.map(link => link.classId) }, student: { isActive: true, OR: [{ externalId: null }, { externalId: "" }] } } }) : 0;
  const { evaluators, ...detail } = subject;
  return { ...detail, canManage, missingExternalIds, assignedEvaluators: canManage ? [...evaluators.map(link => link.evaluator), ...await standaloneSubjectReviewers(id)] : [], tasks: subject.tasks.map(task => ({ ...task, canManage: isAdmin(user) || (canTeach(user) && sameSchool && (managesSchool || task.creatorId === user.id)) })) };
}
