import Link from "next/link";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {ArrowLeft,CalendarDays,Files,Users} from "lucide-react";
import {publicResults} from "@/lib/public-results";
import {PublicResultsTable} from "@/components/public-results-table";
export const dynamic="force-dynamic";
export default async function ClassResults({params,searchParams}:{params:Promise<{locale:string;classId:string}>;searchParams:Promise<{subjectId?:string}>}){
 const [{locale,classId},{subjectId}]=await Promise.all([params,searchParams]);const [data,t]=await Promise.all([publicResults(classId,subjectId),getTranslations("publicResults")]);if(!data)notFound();
 return <>
  <Link href={"/"+locale+"/results"} className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5"/>{t("back")}</Link>
  <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
   <div className="space-y-3"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{t("overview")}</p><h1 className="max-w-3xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{data.name}</h1>{data.subject&&<div className="flex flex-wrap items-center gap-3 text-muted-foreground"><span>{data.subject.name}</span><span className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs font-medium"><CalendarDays className="size-3.5"/>{data.subject.year}</span></div>}</div>
   <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><Users className="size-4"/><strong className="font-semibold text-foreground">{data.rows.length}</strong>{t("studentsCount",{count:data.rows.length})}</span><span className="inline-flex items-center gap-2"><Files className="size-4"/><strong className="font-semibold text-foreground">{data.tasks.length}</strong>{t("tasksCount",{count:data.tasks.length})}</span></div>
  </section>
  {data.subjects.length>1&&<nav aria-label={t("subject")} className="flex flex-wrap gap-2">{data.subjects.map(subject=><Link key={subject.id} href={"/"+locale+"/results/"+classId+"?subjectId="+subject.id} aria-current={data.subject?.id===subject.id?"page":undefined} className={"rounded-lg border px-3 py-2 text-sm "+(data.subject?.id===subject.id?"border-primary/20 bg-accent text-accent-foreground":"bg-card hover:bg-muted")}>{subject.name} · {subject.year}</Link>)}</nav>}
  <PublicResultsTable data={data}/>
 </>;
}
