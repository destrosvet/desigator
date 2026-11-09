import Link from "next/link";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {ArrowLeft,CalendarDays,Files,Users} from "lucide-react";
import {publicSubjectResults} from "@/lib/public-results";
import {PublicResultsTable} from "@/components/public-results-table";
export const dynamic="force-dynamic";
export default async function SubjectResults({params}:{params:Promise<{locale:string;token:string}>}){
 const {locale,token}=await params;const [data,t]=await Promise.all([publicSubjectResults(token),getTranslations("publicResults")]);if(!data)notFound();
 return <>
  <Link href={"/"+locale+"/results"} className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5"/>{t("back")}</Link>
  <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
   <div className="space-y-3"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{t("overview")}</p><h1 className="max-w-3xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{data.name}</h1><div className="flex flex-wrap items-center gap-3 text-muted-foreground"><span>{data.className}</span><span className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs font-medium"><CalendarDays className="size-3.5"/>{data.subject?.year}</span></div></div>
   <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><Users className="size-4"/><strong className="font-semibold text-foreground">{data.rows.length}</strong>{t("studentsCount",{count:data.rows.length})}</span><span className="inline-flex items-center gap-2"><Files className="size-4"/><strong className="font-semibold text-foreground">{data.tasks.length}</strong>{t("tasksCount",{count:data.tasks.length})}</span></div>
  </section>
  <PublicResultsTable data={data}/>
 </>;
}
