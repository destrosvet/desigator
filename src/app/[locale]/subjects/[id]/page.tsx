import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { managedClassScope } from "@/lib/authorization";
import { readSubjectDetail } from "@/lib/subject-detail";
import SubjectDetailClient from "./subject-detail-client";

export default async function SubjectDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/login`);
  const subject = await readSubjectDetail(session.user, id);
  if (!subject) notFound();
  const classes = subject.canManage ? await db.class.findMany({ where: managedClassScope(session.user), select: { id: true, name: true }, orderBy: { name: "asc" } }) : subject.classes.map(link => link.class);
  return <SubjectDetailClient key={id} initialSubject={JSON.parse(JSON.stringify(subject))} classes={classes} />;
}
