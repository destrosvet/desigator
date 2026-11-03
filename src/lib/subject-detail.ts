import { db } from "@/lib/db";
import { visibleSubjectScope, visibleTaskScope, type AuthUser } from "@/lib/authorization";
import { canTeach, isAdmin, isSchoolAdmin } from "@/lib/permissions";

export const subjectEvaluatorSelection = { id: true, name: true, email: true, institution: true, organization: { select: { name: true } } } as const;

export async function readSubjectDetail(user: AuthUser, id: string) {
  const subject = await db.subject.findFirst({
    where: { id, ...visibleSubjectScope(user) },
    select: {
      id: true, code: true, name: true, description: true, semester: true, year: true, teacherId: true,
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
  const { evaluators, ...detail } = subject;
  return { ...detail, canManage, assignedEvaluators: canManage ? evaluators.map(link => link.evaluator) : [], tasks: subject.tasks.map(task => ({ ...task, canManage: isAdmin(user) || (canTeach(user) && sameSchool && (managesSchool || task.creatorId === user.id)) })) };
}
