import {getServerSession} from "next-auth";
import {redirect,notFound} from "next/navigation";
import {authOptions} from "@/lib/auth";
import {subjectResults} from "@/lib/subject-results";
import {AppShell} from "@/components/app-shell";
import {SubjectResultsClient} from "@/components/subject-results-client";
export const dynamic="force-dynamic";
export default async function ResultsPage({params}:{params:Promise<{id:string;locale:string}>}){const {id,locale}=await params;const session=await getServerSession(authOptions);if(!session)redirect("/"+locale+"/auth/login");const data=await subjectResults(session.user,id);if(!data)notFound();return <AppShell><SubjectResultsClient data={data} locale={locale}/></AppShell>;}
