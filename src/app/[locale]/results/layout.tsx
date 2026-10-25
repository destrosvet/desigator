import Link from "next/link";
import {getTranslations} from "next-intl/server";
import {GraduationCap,LogIn,ShieldCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
export const metadata={robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function ResultsLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
 const {locale}=await params;const t=await getTranslations("publicResults");
 return <div className="min-h-screen bg-background">
  <header className="border-b border-border/70 bg-card/90"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
   <Link href={"/"+locale+"/results"} className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><GraduationCap className="size-6"/></span><span className="text-xl font-bold tracking-tight">Desigator<span className="text-primary">.</span></span><span className="ml-3 hidden border-l pl-5 text-sm text-muted-foreground sm:block">{t("title")}</span></Link>
   <Button asChild className="rounded-xl px-4 shadow-sm"><Link href={"/"+locale+"/auth/login"}><LogIn className="size-4"/>{t("login")}</Link></Button>
  </div></header>
  <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8 sm:py-12">{children}</main>
  <footer className="mx-auto flex max-w-7xl items-center gap-2 px-5 pb-8 text-xs text-muted-foreground sm:px-8"><ShieldCheck className="size-3.5 shrink-0"/>{t("sharedNotice")}</footer>
 </div>;
}
