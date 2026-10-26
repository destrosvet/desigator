import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  Box,
  Check,
  FileText,
  Github,
  Image as ImageIcon,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { authOptions } from "@/lib/auth";

type FeatureIcon = "layers" | "feedback" | "shield";
type LandingCopy = {
  metaTitle: string; metaDescription: string; nav: [string, string][];
  login: string; app: string; eyebrow: string; titleA: string; titleB: string; intro: string;
  primary: string; signedPrimary: string; secondary: string; trust: string[];
  mockCourse: string; mockTask: string; mockStudent: string; mockVersion: string; mockScore: string;
  mockReview: string; mockCriterion: string; mockNote: string;
  flowEyebrow: string; flowTitle: string; flowIntro: string;
  features: { title: string; text: string; icon: FeatureIcon }[];
  steps: [string, string, string][];
  openEyebrow: string; openTitle: string; openText: string; openPoints: string[]; github: string;
  ctaEyebrow: string; ctaTitle: string; ctaText: string; footer: string;
};
const copy: Record<"cs" | "en", LandingCopy> = {
  cs: {
    metaTitle: "Desigator — smysluplné hodnocení kreativní práce",
    metaDescription: "Open-source prostor pro zadávání, odevzdávání a hodnocení vizuální tvorby ve školách a kreativních oborech.",
    nav: [
      ["Možnosti", "#features"],
      ["Jak funguje", "#how-it-works"],
      ["Open source", "#open-source"],
    ],
    login: "Přihlásit se",
    app: "Otevřít aplikaci",
    eyebrow: "Pro školy, ateliéry a kreativní týmy",
    titleA: "Kreativní práce si zaslouží",
    titleB: "lepší zpětnou vazbu.",
    intro: "Desigator propojuje zadání, odevzdání, vizuální náhledy a férové hodnocení v jednom klidném pracovním prostoru.",
    primary: "Přejít k přihlášení",
    signedPrimary: "Pokračovat do aplikace",
    secondary: "Prohlédnout možnosti",
    trust: ["Vlastní data", "Privátní úložiště", "Bez vendor lock-inu"],
    mockCourse: "Vizuální identita",
    mockTask: "Systém značky",
    mockStudent: "Klára Novotná",
    mockVersion: "Finální verze · před 12 min",
    mockScore: "84 / 100",
    mockReview: "Hodnocení práce",
    mockCriterion: "Koncepce a konzistence",
    mockNote: "Silný systém, který drží napříč formáty. Zpřesněte ještě práci s kontrastem.",
    flowEyebrow: "Jeden souvislý proces",
    flowTitle: "Od prvního briefu až po reflexi výsledků.",
    flowIntro: "Méně přepínání mezi disky, tabulkami a e-maily. Více času na práci, která studenty skutečně posouvá.",
    features: [
      { title: "Práce v kontextu", text: "Obrázky, PDF, video i 3D modely se hodnotí přímo vedle kritérií a komentářů.", icon: "layers" },
      { title: "Jasná a férová kritéria", text: "Rubriky, bodování a stav hodnocení dávají studentům i hodnotitelům společný rámec.", icon: "feedback" },
      { title: "Přehled bez ztráty soukromí", text: "Výsledky, trendy a historická data zůstávají pod kontrolou školy na vlastní infrastruktuře.", icon: "shield" },
    ],
    steps: [
      ["01", "Zadejte práci", "Připravte brief, termín, přílohy a kritéria pro celý ateliér."],
      ["02", "Sledujte vývoj", "Studenti odevzdávají rozpracované i finální verze bez chaosu v souborech."],
      ["03", "Hodnoťte společně", "Interní i externí hodnotitelé zapisují body a zpětnou vazbu na jednom místě."],
    ],
    openEyebrow: "Otevřený software. Vaše pravidla.",
    openTitle: "Technologie, která škole nebere kontrolu.",
    openText: "Desigator je open source pod GPLv3. Provozujte jej na vlastní infrastruktuře, připojte své S3 úložiště a rozvíjejte ho podle potřeb své instituce.",
    openPoints: ["PostgreSQL a S3 kompatibilní úložiště", "Role pro správce, učitele, hodnotitele a studenty", "Přenositelnost dat a transparentní zdrojový kód"],
    github: "Zdrojový kód na GitHubu",
    ctaEyebrow: "Méně administrativy. Lepší rozhovor o práci.",
    ctaTitle: "Vraťte hodnocení zpátky k tvorbě.",
    ctaText: "Přihlaste se do svého školního prostoru a pokračujte tam, kde vznikají dobré nápady.",
    footer: "Open-source platforma pro kreativní vzdělávání.",
  },
  en: {
    metaTitle: "Desigator — meaningful feedback for creative work",
    metaDescription: "An open-source workspace for assigning, submitting, and reviewing visual work in schools and creative programs.",
    nav: [["Features", "#features"], ["How it works", "#how-it-works"], ["Open source", "#open-source"]],
    login: "Sign in", app: "Open workspace",
    eyebrow: "For schools, studios, and creative teams",
    titleA: "Creative work deserves",
    titleB: "better feedback.",
    intro: "Desigator brings briefs, submissions, visual previews, and fair assessment into one calm workspace.",
    primary: "Continue to sign in", signedPrimary: "Continue to workspace", secondary: "Explore the product",
    trust: ["Own your data", "Private storage", "No vendor lock-in"],
    mockCourse: "Visual identity", mockTask: "Brand system", mockStudent: "Clara Novak", mockVersion: "Final version · 12 min ago", mockScore: "84 / 100", mockReview: "Project review", mockCriterion: "Concept and consistency", mockNote: "A strong system that holds together across formats. Refine the use of contrast next.",
    flowEyebrow: "One connected workflow", flowTitle: "From the first brief to meaningful reflection.", flowIntro: "Less switching between drives, spreadsheets, and email. More time for the work that helps students grow.",
    features: [
      { title: "Work in context", text: "Review images, PDFs, video, and 3D models right beside criteria and feedback.", icon: "layers" },
      { title: "Clear, fair criteria", text: "Rubrics, scores, and review status give students and evaluators a shared frame of reference.", icon: "feedback" },
      { title: "Insight without losing privacy", text: "Results, trends, and historical data stay under your institution's control.", icon: "shield" },
    ],
    steps: [["01", "Set the brief", "Prepare the task, deadline, references, and criteria for the whole studio."], ["02", "Follow the process", "Students submit work-in-progress and final versions without file chaos."], ["03", "Review together", "Internal and external reviewers add scores and feedback in one place."]],
    openEyebrow: "Open software. Your rules.", openTitle: "Technology that keeps institutions in control.", openText: "Desigator is open source under GPLv3. Run it on your own infrastructure, connect your S3 storage, and shape it around the way your institution works.", openPoints: ["PostgreSQL and S3-compatible storage", "Roles for administrators, teachers, reviewers, and students", "Portable data and transparent source code"], github: "View source on GitHub",
    ctaEyebrow: "Less administration. Better conversations about work.", ctaTitle: "Bring assessment back to the creative process.", ctaText: "Sign in to your institution's workspace and continue where good ideas take shape.", footer: "Open-source software for creative education.",
  },
};

const featureIcons = {
  layers: Layers3,
  feedback: MessageSquareText,
  shield: ShieldCheck,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = locale === "en" ? copy.en : copy.cs;
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = locale === "en" ? copy.en : copy.cs;
  const session = await getServerSession(authOptions);
  const appHref = session ? `/${locale}/dashboard` : `/${locale}/auth/login`;

  return (
    <main className="landing-page min-h-screen overflow-hidden bg-[#f7f3ec] text-[#171713] dark:bg-[#121210] dark:text-[#f7f3ec]">
      <div className="landing-noise" aria-hidden="true" />
      <nav aria-label="Main navigation" className="relative z-30 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href={`/${locale}`} className="flex items-center gap-3" aria-label="Desigator home">
          <span className="brand-mark flex size-10 items-center justify-center rounded-[14px] text-white shadow-[0_8px_24px_-10px_rgba(185,68,17,.8)]"><Sparkles className="size-[18px]" aria-hidden="true" /></span>
          <span className="text-xl font-bold tracking-[-0.04em]">Desigator<span className="text-[#b94411] dark:text-[#ffad70]">.</span></span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-black/60 dark:text-white/60 md:flex">
          {t.nav.map(([label, href]) => <a key={href} href={href} className="transition-colors hover:text-black dark:hover:text-white">{label}</a>)}
        </div>
        <Link href={appHref} className="group inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white/75 px-5 text-sm font-semibold shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md dark:border-white/15 dark:bg-white/5">
          {session ? t.app : t.login}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </nav>

      <section className="relative mx-auto grid max-w-[1440px] items-center gap-14 px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[.86fr_1.14fr] lg:px-12 lg:pb-32 lg:pt-24">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#b94411]/20 bg-[#b94411]/7 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#97360d] dark:border-[#ffad70]/25 dark:bg-[#ffad70]/10 dark:text-[#ffbd8b]">
            <span className="size-1.5 rounded-full bg-[#b94411] dark:bg-[#ffad70]" />{t.eyebrow}
          </div>
          <h1 className="text-balance text-[clamp(3.4rem,7vw,7.4rem)] font-semibold leading-[.88] tracking-[-.065em]">
            {t.titleA}<br/><span className="landing-accent italic">{t.titleB}</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-black/62 dark:text-white/62 sm:text-xl">{t.intro}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={appHref} className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-[#171713] px-7 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(23,23,19,.7)] transition hover:-translate-y-0.5 hover:bg-[#b94411] dark:bg-[#f7f3ec] dark:text-[#171713] dark:hover:bg-[#ffad70]">
              {session ? t.signedPrimary : t.primary}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <a href="#features" className="inline-flex h-14 items-center justify-center rounded-full border border-black/15 px-7 text-sm font-semibold transition hover:border-black/35 hover:bg-white/50 dark:border-white/20 dark:hover:bg-white/5">{t.secondary}</a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-black/50 dark:text-white/50">
            {t.trust.map(item => <span key={item} className="flex items-center gap-2"><Check className="size-3.5 text-[#b94411] dark:text-[#ffad70]" aria-hidden="true" />{item}</span>)}
          </div>
        </div>

        <div className="relative min-h-[520px] lg:min-h-[650px]">
          <div className="absolute -inset-12 rounded-full bg-[radial-gradient(circle,rgba(185,68,17,.17),transparent_65%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(255,173,112,.12),transparent_65%)]" aria-hidden="true" />
          <div className="landing-product absolute left-1/2 top-1/2 w-[760px] max-w-[112%] -translate-x-1/2 -translate-y-1/2 rotate-[-2deg] overflow-hidden rounded-[28px] border border-black/10 bg-[#fcfbf8] shadow-[0_45px_100px_-40px_rgba(41,28,18,.45)] dark:border-white/10 dark:bg-[#1b1b18]">
            <div className="flex h-12 items-center justify-between border-b border-black/8 px-5 dark:border-white/10">
              <div className="flex gap-1.5"><span className="size-2.5 rounded-full bg-[#e76949]"/><span className="size-2.5 rounded-full bg-[#e6b65c]"/><span className="size-2.5 rounded-full bg-[#72ad7e]"/></div>
              <div className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-semibold text-black/45 dark:bg-white/8 dark:text-white/45">desigator / review</div>
              <div className="size-6 rounded-full bg-[#b94411]/15" />
            </div>
            <div className="grid min-h-[470px] grid-cols-[135px_1fr_190px] sm:min-h-[540px] sm:grid-cols-[160px_1fr_220px]">
              <aside className="border-r border-black/8 bg-[#f3efe7] p-4 dark:border-white/10 dark:bg-[#171714]">
                <p className="mb-5 text-xs font-bold tracking-tight">Desigator<span className="text-[#b94411]">.</span></p>
                {["Overview", t.mockCourse, "Students", "Results"].map((item, i) => <div key={item} className={`mb-2 rounded-lg px-3 py-2 text-[10px] font-medium ${i===1?'bg-white text-[#b94411] shadow-sm dark:bg-white/10 dark:text-[#ffad70]':'text-black/40 dark:text-white/40'}`}>{item}</div>)}
              </aside>
              <div className="p-5 sm:p-7">
                <div className="mb-5 flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#b94411] dark:text-[#ffad70]">{t.mockCourse}</p><h2 className="mt-1 text-lg font-semibold tracking-tight">{t.mockTask}</h2></div><span className="rounded-full bg-[#e8f3ed] px-2 py-1 text-[9px] font-semibold text-[#276347]">Final</span></div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#e9dfd3] dark:bg-[#27231f]">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#c94e19_0_28%,transparent_28%_40%,#1f2520_40%_61%,#ead6b5_61%)]" />
                  <div className="absolute left-[14%] top-[18%] h-[62%] w-[36%] rotate-[-8deg] rounded-sm bg-[#f8f1e6] shadow-2xl"><div className="m-4 h-1/2 bg-[#171713]"/><p className="px-4 text-[8px] font-bold uppercase tracking-[.2em]">Form / Function</p></div>
                  <div className="absolute bottom-[12%] right-[9%] size-[34%] rounded-full border-[18px] border-[#f5b354] bg-[#b94411] shadow-xl" />
                </div>
                <div className="mt-4 flex items-center justify-between"><div><p className="text-xs font-semibold">{t.mockStudent}</p><p className="mt-1 text-[9px] text-black/40 dark:text-white/40">{t.mockVersion}</p></div><div className="flex gap-1.5"><span className="flex size-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/8"><ImageIcon className="size-3"/></span><span className="flex size-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/8"><FileText className="size-3"/></span><span className="flex size-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/8"><Box className="size-3"/></span></div></div>
              </div>
              <aside className="border-l border-black/8 bg-white p-4 dark:border-white/10 dark:bg-[#20201d] sm:p-5">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold">{t.mockReview}</p><span className="text-sm font-bold text-[#b94411] dark:text-[#ffad70]">{t.mockScore}</span></div>
                <div className="mt-6"><p className="text-[10px] font-semibold">{t.mockCriterion}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/10"><div className="h-full w-[84%] rounded-full bg-[#b94411] dark:bg-[#ffad70]"/></div><div className="mt-2 flex justify-between text-[8px] text-black/35 dark:text-white/35"><span>0</span><span>25</span></div></div>
                <div className="mt-5 rounded-xl bg-[#f5f1ea] p-3 dark:bg-white/5"><MessageSquareText className="mb-2 size-3.5 text-[#b94411] dark:text-[#ffad70]"/><p className="text-[9px] leading-relaxed text-black/55 dark:text-white/55">{t.mockNote}</p></div>
                <div className="mt-5 space-y-2">{[72,91,80].map((w,i)=><div key={i} className="h-8 rounded-lg border border-black/7 p-2 dark:border-white/10"><div className="h-1.5 rounded-full bg-black/8 dark:bg-white/10"><div className="h-full rounded-full bg-black/25 dark:bg-white/25" style={{width:`${w}%`}}/></div></div>)}</div>
              </aside>
            </div>
          </div>
          <div className="landing-float absolute bottom-2 left-0 z-10 rounded-2xl border border-black/10 bg-white/85 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#24241f]/90 sm:left-4 lg:bottom-10"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#b94411] text-white"><UploadCloud className="size-4"/></span><div><p className="text-xs font-semibold">3D model uploaded</p><p className="mt-0.5 text-[10px] text-black/45 dark:text-white/45">chair-study-v4.glb · 18.4 MB</p></div></div></div>
        </div>
      </section>

      <section id="features" className="scroll-mt-10 border-y border-black/8 bg-white/55 py-24 dark:border-white/10 dark:bg-white/[.025] sm:py-32">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-24"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b94411] dark:text-[#ffad70]">{t.flowEyebrow}</p><h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-.045em] sm:text-6xl">{t.flowTitle}</h2></div><p className="max-w-xl self-end text-lg leading-8 text-black/55 dark:text-white/55">{t.flowIntro}</p></div>
          <div className="mt-16 grid gap-4 md:grid-cols-3">{t.features.map(feature=>{const Icon=featureIcons[feature.icon];return <article key={feature.title} className="group rounded-[26px] border border-black/9 bg-[#fbfaf7] p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-35px_rgba(31,25,18,.45)] dark:border-white/10 dark:bg-[#1a1a17]"><span className="flex size-12 items-center justify-center rounded-2xl bg-[#b94411]/10 text-[#b94411] transition group-hover:bg-[#b94411] group-hover:text-white dark:bg-[#ffad70]/10 dark:text-[#ffad70]"><Icon className="size-5"/></span><h3 className="mt-8 text-xl font-semibold tracking-tight">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-black/52 dark:text-white/52">{feature.text}</p></article>})}</div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-10 mx-auto max-w-[1240px] px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-14 lg:grid-cols-[.7fr_1.3fr] lg:gap-24"><div className="lg:sticky lg:top-20 lg:self-start"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b94411] dark:text-[#ffad70]">Workflow</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">{t.flowTitle}</h2></div><div>{t.steps.map(([number,title,text])=><article key={number} className="grid grid-cols-[48px_1fr] gap-5 border-t border-black/12 py-8 dark:border-white/12 sm:grid-cols-[70px_1fr] sm:py-10"><span className="font-mono text-sm text-[#b94411] dark:text-[#ffad70]">{number}</span><div><h3 className="text-2xl font-semibold tracking-tight">{title}</h3><p className="mt-3 max-w-xl leading-7 text-black/52 dark:text-white/52">{text}</p></div></article>)}</div></div>
      </section>

      <section id="open-source" className="scroll-mt-10 mx-auto max-w-[1340px] px-5 pb-24 sm:px-8 sm:pb-32">
        <div className="relative overflow-hidden rounded-[32px] bg-[#191914] px-7 py-14 text-[#f8f4ed] sm:px-12 sm:py-20 lg:px-20">
          <div className="absolute -right-24 -top-28 size-[420px] rounded-full border-[80px] border-[#b94411]/35" aria-hidden="true"/><div className="absolute bottom-[-180px] right-[20%] size-[360px] rounded-full bg-[#b94411]/15 blur-3xl" aria-hidden="true"/>
          <div className="relative grid gap-14 lg:grid-cols-[1.15fr_.85fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ffad70]">{t.openEyebrow}</p><h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-.05em] sm:text-6xl">{t.openTitle}</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">{t.openText}</p><a href="https://github.com/destrosvet/desigator" target="_blank" rel="noreferrer" className="mt-8 inline-flex h-12 items-center gap-3 rounded-full bg-[#f8f4ed] px-6 text-sm font-semibold text-[#191914] transition hover:-translate-y-0.5 hover:bg-[#ffad70]"><Github className="size-4"/>{t.github}</a></div><div className="space-y-4">{t.openPoints.map(point=><div key={point} className="flex gap-3 border-t border-white/14 pt-4 text-sm text-white/75"><Check className="mt-0.5 size-4 shrink-0 text-[#ffad70]"/>{point}</div>)}</div></div>
        </div>
      </section>

      <section className="px-5 pb-20 text-center sm:px-8 sm:pb-28"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b94411] dark:text-[#ffad70]">{t.ctaEyebrow}</p><h2 className="mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">{t.ctaTitle}</h2><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-black/55 dark:text-white/55">{t.ctaText}</p><Link href={appHref} className="group mt-9 inline-flex h-14 items-center gap-3 rounded-full bg-[#b94411] px-8 text-sm font-semibold text-white shadow-[0_18px_45px_-18px_rgba(185,68,17,.65)] transition hover:-translate-y-0.5 hover:bg-[#96360e] dark:bg-[#ffad70] dark:text-[#26160d]">{session?t.app:t.login}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1"/></Link></div></section>

      <footer className="border-t border-black/10 px-5 py-8 dark:border-white/10 sm:px-8"><div className="mx-auto flex max-w-[1240px] flex-col gap-4 text-xs text-black/45 dark:text-white/45 sm:flex-row sm:items-center sm:justify-between"><p><strong className="text-black/75 dark:text-white/75">Desigator.</strong> {t.footer}</p><div className="flex gap-5"><a href="https://github.com/destrosvet/desigator" target="_blank" rel="noreferrer" className="hover:text-black dark:hover:text-white">GitHub</a><span>GPLv3</span><Link href={`/${locale}/auth/login`} className="hover:text-black dark:hover:text-white">{t.login}</Link></div></div></footer>
    </main>
  );
}