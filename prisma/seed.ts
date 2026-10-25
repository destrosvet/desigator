import { PrismaClient, UserRole, SemesterType, type User, type Subject } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seed is disabled in production. Use npm run db:admin to create an administrator.");
  }
  await prisma.organization.upsert({ where: { id: "legacy" }, update: {}, create: { id: "legacy", name: "Původní organizace Desigator" } });
  const adminEmail = process.env.ADMIN_EMAIL || "admin@desigator.cz";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  // ===== ADMIN =====
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "Administrátor",
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 12),
        role: UserRole.ADMIN, roles: [UserRole.ADMIN],
      },
    });
    console.log(`✅ Admin vytvořen: ${adminEmail}`);
  }

  // ===== UČITEL =====
  let teacher = await prisma.user.findUnique({ where: { email: "teacher@desigator.cz" } });
  if (!teacher) {
    teacher = await prisma.user.create({
      data: {
        name: "Pan Učitel",
        email: "teacher@desigator.cz",
        password: await bcrypt.hash("teacher123", 12),
        role: UserRole.TEACHER, roles: [UserRole.TEACHER, UserRole.EVALUATOR], organizationId: "legacy",
      },
    });
    console.log(`✅ Učitel: teacher@desigator.cz / teacher123`);
  }

  // ===== HODNOTITEL =====
  let evaluator = await prisma.user.findUnique({ where: { email: "evaluator@desigator.cz" } });
  if (!evaluator) {
    evaluator = await prisma.user.create({
      data: {
        name: "Pan Hodnotitel",
        email: "evaluator@desigator.cz",
        password: await bcrypt.hash("evaluator123", 12),
        role: UserRole.EVALUATOR, roles: [UserRole.EVALUATOR],
      },
    });
    console.log(`✅ Hodnotitel: evaluator@desigator.cz / evaluator123`);
  }

  // ===== STUDENTI =====
  const studentData = [
    { email: "student1@desigator.cz", externalId: "S001", name: "Student 1" },
    { email: "student2@desigator.cz", externalId: "S002", name: "Student 2" },
    { email: "student3@desigator.cz", externalId: "S003", name: "Student 3" },
  ];
  const students: User[] = [];
  for (const s of studentData) {
    let student = await prisma.user.findUnique({ where: { email: s.email } });
    if (!student) {
      student = await prisma.user.create({
        data: {
          name: s.name,
          email: s.email,
          externalId: s.externalId,
          password: await bcrypt.hash("student123", 12),
          role: UserRole.STUDENT, roles: [UserRole.STUDENT], organizationId: "legacy",
        },
      });
      console.log(`✅ Student: ${s.email} / externalId: ${s.externalId} / student123`);
    }
    students.push(student);
  }

  // ===== TŘÍDA =====
  let cls = await prisma.class.findUnique({ where: { code: "DESIGN26" } });
  if (!cls) {
    cls = await prisma.class.create({
      data: {
        name: "Design – demonstrační ateliér",
        description: "Grafická tvorba, design, animace a 3D modelování",
        code: "DESIGN26",
        teacherId: teacher!.id,
        students: {
          create: students.map((s) => ({ studentId: s.id })),
        },
      },
    });
    console.log(`✅ Třída: ${cls.name} (kód: ${cls.code})`);
  }

  // ===== PŘEDMĚTY =====
  const subjectsData = [
    { name: "Počítačová grafika", semester: SemesterType.FULL_YEAR, year: 2026 },
    { name: "Grafický design", semester: SemesterType.SUMMER, year: 2026 },
    { name: "3D modelování a animace", semester: SemesterType.WINTER, year: 2026 },
  ];

  const subjects: Subject[] = [];
  for (const subj of subjectsData) {
    let subject = await prisma.subject.findFirst({
      where: { name: subj.name, classId: cls!.id },
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          name: subj.name,
          description: `Předmět ${subj.name} pro školní rok ${subj.year}`,
          semester: subj.semester,
          year: subj.year,
          classId: cls!.id,
          teacherId: teacher!.id,
        },
      });
      console.log(`✅ Předmět: ${subject.name} (${subj.semester}, ${subj.year})`);
    }
    subjects.push(subject);
  }

  // ===== TASKY =====
  const tasksData = [
    {
      title: "Digitální ilustrace – geometrická kompozice",
      description: "Vytvořte ilustraci s důrazem na kompozici, barevnost a technické zpracování. Odevzdejte finální obrázek a případné detaily.",
      subjectIndex: 0,
      status: "PUBLISHED" as const,
    },
    {
      title: "Vizuální identita kulturní akce",
      description: "Navrhněte vizuální identitu kulturní akce a prezentujte ji na plakátu a dalších grafických výstupech.",
      subjectIndex: 1,
      status: "PUBLISHED" as const,
    },
    {
      title: "3D objekt a krátká animace",
      description: "Vytvořte prostorový objekt, připravte materiály a prezentujte model pomocí renderů a krátké animace.",
      subjectIndex: 2,
      status: "DRAFT" as const,
    },
  ];

  for (const taskData of tasksData) {
    const existing = await prisma.task.findFirst({
      where: { title: taskData.title, subjectId: subjects[taskData.subjectIndex].id },
    });
    if (!existing) {
      await prisma.task.create({
        data: {
          title: taskData.title,
          description: taskData.description,
          maxPoints: 100,
          status: taskData.status,
          creatorId: teacher!.id,
          subjectId: subjects[taskData.subjectIndex].id,
          criteria: {
            create: [
              { name: "Splnění zadání", description: "Dílo odpovídá zadání a obsahuje požadované výstupy", maxPoints: 40, order: 0 },
              { name: "Vizuální zpracování", description: "Kompozice, barevnost a originalita návrhu", maxPoints: 30, order: 1 },
              { name: "Technické provedení", description: "Kvalita zpracování a přípravy výstupních souborů", maxPoints: 30, order: 2 },
            ],
          },
        },
      });
      console.log(`✅ Task: ${taskData.title}`);
    }
  }

  // ===== ODEVZDÁNÍ =====
  const task = await prisma.task.findFirst({ where: { title: "Digitální ilustrace – geometrická kompozice", creatorId: teacher.id } });
  if (task) {
    const existingSub = await prisma.submission.findFirst({
      where: { taskId: task.id, studentId: students[0].id },
    });
    if (!existingSub) {
      await prisma.submission.create({
        data: {
          taskId: task.id,
          studentId: students[0].id,
          content: "Odevzdávám geometrickou kompozici. Finální obraz a doplňující výstupy jsou součástí práce.",
          status: "SUBMITTED",
        },
      });
      console.log(`✅ Odevzdání vytvořeno`);
    }
  }

  console.log("\n🎉 Seed dokončen!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
