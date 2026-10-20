import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClassesClient } from "./classes-client";

export default async function ClassesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/login`);

  const classes = await db.class.findMany({
    where: session.user.role === "ADMIN"
      ? { isActive: true }
      : session.user.role === "TEACHER"
        ? { teacherId: session.user.id, isActive: true }
        : { students: { some: { studentId: session.user.id } }, isActive: true },
    include: {
      teacher: { select: { name: true } },
      _count: { select: { students: true, subjects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <ClassesClient locale={locale} role={session.user.role} classes={classes} />;
}