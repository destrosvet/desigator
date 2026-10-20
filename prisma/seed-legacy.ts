import { PrismaClient, UserRole, SemesterType, TaskStatus, EvaluationStatus } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

interface LegacyData {
  'dg_user': string[][];
  'dg_course': string[][];
  'dg_task': string[][];
  'dg_course_task': string[][];
  'dg_user_course': string[][];
  'dg_mark': string[][];
}

function clean(val: string): string {
  return val?.replace(/^'|'$/g, '').replace(/\\'/g, "'") || '';
}

async function main() {
  const data: LegacyData = JSON.parse(readFileSync('./db/legacy-data.json', 'utf-8'));

  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: 'Administrátor',
        email: 'admin@desigator.cz',
        password: '$2a$12$legacyhashnotusable',
        role: UserRole.ADMIN,
      }
    });
  }

  // 1. Legacy class
  const legacyClass = await prisma.class.create({
    data: {
      name: 'Historické kurzy',
      code: 'LEGACY',
      description: 'Migrovaná data ze starého systému Desigator',
      teacherId: admin.id,
    }
  });
  console.log('✅ Legacy class vytvořena');

  // 2. Users (476)
  const userMap = new Map<number, string>();
  for (const row of data['dg_user']) {
    const [user_id, user_uid, user_name, user_email, user_role] = row;
    const role = user_role === '1' ? UserRole.ADMIN : user_role === '3' ? UserRole.EVALUATOR : UserRole.STUDENT;
    const email = clean(user_email) || `legacy-user-${user_id}@local`;
    const name = clean(user_name) || 'Neznámý';

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const extId = user_uid && user_uid !== 'NULL' && user_uid !== "''" ? user_uid : undefined;
      const createData: any = { name, email, legacyId: parseInt(user_id), password: '$2a$12$legacy', role };
      if (extId) {
        const existingExt = await prisma.user.findUnique({ where: { externalId: extId } });
        if (!existingExt) createData.externalId = extId;
      }
      user = await prisma.user.create({ data: createData });
    }
    userMap.set(parseInt(user_id), user.id);
  }
  console.log(`✅ Users importováno: ${userMap.size}`);

  // 3. Courses → Subjects (49)
  const courseMap = new Map<number, string>();
  for (const row of data['dg_course']) {
    const [course_id, course_name, course_year, course_semester, course_description] = row;
    const code = clean(course_name);
    if (!code) continue;

    const semester = course_semester === '1' ? SemesterType.SUMMER : SemesterType.WINTER;
    const year = course_year === '0000' ? 2012 : parseInt(course_year);

    const subject = await prisma.subject.create({
      data: {
        code,
        name: clean(course_description) || code,
        description: clean(course_description),
        semester,
        year,
        classId: legacyClass.id,
        teacherId: admin.id,
      }
    });
    courseMap.set(parseInt(course_id), subject.id);
  }
  console.log(`✅ Subjects importováno: ${courseMap.size}`);

  // 4. Tasks (141)
  const firstSubjectId = courseMap.values().next().value;
  if (!firstSubjectId) throw new Error("Legacy import requires at least one subject");
  const taskMap = new Map<number, string>();
  for (const row of data['dg_task']) {
    const [task_id, , task_name, task_description, task_condition, , , task_points] = row;
    const task = await prisma.task.create({
      data: {
        title: clean(task_name),
        description: clean(task_description),
        instructions: clean(task_condition),
        maxPoints: parseInt(task_points) || 10,
        status: TaskStatus.PUBLISHED,
        creatorId: admin.id,
        legacyId: parseInt(task_id),
        subjectId: firstSubjectId,
      }
    });
    taskMap.set(parseInt(task_id), task.id);
  }
  console.log(`✅ Tasks importováno: ${taskMap.size}`);

  // 5. Propojit tasks s subjects (dg_course_task)
  for (const row of data['dg_course_task']) {
    const [id_task, id_course] = row;
    const taskId = taskMap.get(parseInt(id_task));
    const subjectId = courseMap.get(parseInt(id_course));
    if (taskId && subjectId) {
      await prisma.task.update({ where: { id: taskId }, data: { subjectId } });
    }
  }
  console.log('✅ Tasks propojeny s Subjects');

  // 6. UserCourse → ClassStudent (1429)
  const seen = new Set<string>();
  for (const row of data['dg_user_course']) {
    const [, id_user] = row;
    const userId = userMap.get(parseInt(id_user));
    if (userId) {
      const key = `${legacyClass.id}-${userId}`;
      if (!seen.has(key)) {
        seen.add(key);
        await prisma.classStudent.create({
          data: { classId: legacyClass.id, studentId: userId }
        });
      }
    }
  }
  console.log(`✅ ClassStudents importováno: ${seen.size}`);

  // 7. Marks → Submissions + Evaluations (10328)
  const submissionMap = new Map<string, string>(); // userId_taskId → submissionId
  const evalSeen = new Set<string>(); // submissionId_evaluatorId
  let markCount = 0;

  for (const row of data['dg_mark']) {
    const [date, id_user, id_judge, id_task, mark, description] = row;
    const studentId = userMap.get(parseInt(id_user));
    const evaluatorId = userMap.get(parseInt(id_judge));
    const taskId = taskMap.get(parseInt(id_task));

    if (!studentId || !evaluatorId || !taskId) continue;

    const subKey = `${studentId}_${taskId}`;
    let submissionId = submissionMap.get(subKey);

    if (!submissionId) {
      const submission = await prisma.submission.create({
        data: {
          taskId,
          studentId,
          status: 'EVALUATED',
        }
      });
      submissionId = submission.id;
      submissionMap.set(subKey, submissionId);
    }

    const evalKey = `${submissionId}_${evaluatorId}`;
    if (!evalSeen.has(evalKey)) {
      evalSeen.add(evalKey);
      await prisma.evaluation.create({
        data: {
          submissionId,
          evaluatorId,
          totalPoints: parseInt(mark) || 0,
          feedback: clean(description),
          status: EvaluationStatus.COMPLETED,
          evaluatedAt: new Date(date),
        }
      });
      markCount++;
    }
  }
  console.log(`✅ Marks importováno: ${markCount} (submissions: ${submissionMap.size})`);

  console.log('\n🎉 Všechna legacy data importována!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
