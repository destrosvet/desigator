import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canTeach } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { StatisticsClient } from "@/components/statistics-client";
export default async function StatisticsPage({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params;const session=await getServerSession(authOptions);
 if(!session)redirect('/'+locale+'/auth/login');
 if(!canTeach(session.user))redirect('/'+locale+'/dashboard');
 return <AppShell><StatisticsClient /></AppShell>;
}
