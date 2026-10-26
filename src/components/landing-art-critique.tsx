"use client";

import { useEffect, useState } from "react";
import { LandingArtwork } from "./landing-artwork";

const works = [
  { id: "mona", place: "Florence · 1503", author: "L. da Vinci", title: "Mona Lisa", gradeA: "C−", gradeB: "D", cs: "Není úplně jasné, jestli se směje.", en: "It is not entirely clear whether she is smiling." },
  { id: "starry", place: "Saint-Rémy · 1889", author: "V. van Gogh", title: "The Starry Night", gradeA: "D+", gradeB: "C", cs: "Obloha působí trochu neklidně. Zkuste rovnější tahy.", en: "The sky feels a little busy. Try straighter brushstrokes." },
  { id: "scream", place: "Oslo · 1893", author: "E. Munch", title: "The Scream", gradeA: "D", gradeB: "C−", cs: "Výraz je zbytečně dramatický. Ubral bych emoce.", en: "The expression is unnecessarily dramatic. Tone down the emotion." },
  { id: "pearl", place: "Delft · 1665", author: "J. Vermeer", title: "Girl with a Pearl Earring", gradeA: "C", gradeB: "D+", cs: "Náušnice odvádí pozornost. Možná ji odstranit.", en: "The earring is distracting. Consider removing it." },
  { id: "wave", place: "Kanagawa · 1831", author: "K. Hokusai", title: "The Great Wave", gradeA: "D", gradeB: "B−", cs: "Vlna přebíjí hlavní motiv. Zkuste klidnější moře.", en: "The wave overwhelms the subject. Try a calmer sea." },
  { id: "clocks", place: "Portlligat · 1931", author: "S. Dalí", title: "The Persistence of Memory", gradeA: "C−", gradeB: "D", cs: "Hodiny nedrží tvar. Doporučuji pevnější materiál.", en: "The clocks do not hold their shape. Try a firmer material." },
] as const;

export function LandingArtCritique({ locale }: { locale: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (paused || focused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % works.length), 5600);
    return () => window.clearInterval(timer);
  }, [paused, focused]);
  const work = works[active];
  const english = locale === "en";
  return <div className="landing-art-stage relative min-w-0" onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="absolute -inset-12 rounded-full bg-[radial-gradient(circle,rgba(185,68,17,.17),transparent_65%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(255,173,112,.12),transparent_65%)]" aria-hidden="true" />
    <div className="landing-product relative mx-auto w-full rounded-[30px] border border-black/10 bg-[#e7ddcd] p-5 shadow-[0_45px_100px_-40px_rgba(41,28,18,.5)] dark:border-white/10 dark:bg-[#25221d] sm:p-7">
      <div className="landing-art-board relative overflow-hidden rounded-[22px] bg-[#d5c8b5] p-5 dark:bg-[#1b1a17] sm:p-7">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(62,45,29,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(62,45,29,.12)_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden="true" />
        <div className="landing-art-meta relative flex items-center justify-between text-[10px] font-bold uppercase tracking-[.2em] text-black/45 dark:text-white/45"><span>Studio critique № {String(active + 1).padStart(2, "0")}</span><span>{work.place}</span></div>
        <div key={work.id} className="artwork-enter relative mx-auto mt-7 w-[68%] max-w-[330px] rotate-[-1deg] border-[10px] border-[#4a3020] bg-[#9b7b4e] p-2 shadow-[0_28px_45px_-20px_rgba(38,24,14,.7)] sm:border-[14px]" aria-label={work.title}><LandingArtwork id={work.id} title={work.title}/></div>
        <div key={work.id + "a"} className="landing-note artwork-note absolute left-3 top-[23%] -rotate-[7deg] rounded-sm bg-[#f5cb57] px-4 py-3 text-[#2c2415] shadow-lg sm:left-7"><p className="text-[9px] font-bold uppercase tracking-[.16em]">{english ? "Composition" : "Kompozice"}</p><p className="mt-1 font-mono text-2xl font-bold">{work.gradeA}</p></div>
        <div key={work.id + "b"} className="landing-note artwork-note absolute right-2 top-[13%] rotate-[6deg] rounded-sm bg-[#e97a5f] px-4 py-3 text-[#31150f] shadow-lg sm:right-7"><p className="text-[9px] font-bold uppercase tracking-[.16em]">{english ? "Colour" : "Barvy"}</p><p className="mt-1 font-mono text-2xl font-bold">{work.gradeB}</p></div>
        <div key={work.id + "c"} className="landing-note artwork-note absolute bottom-10 right-2 w-[210px] -rotate-[3deg] rounded-sm bg-[#f2eadb] p-4 text-[#2a251e] shadow-xl sm:bottom-10 sm:right-8 sm:w-[245px]"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#b94411]">{english ? "Tutor note" : "Poznámka vedoucího"}</p><p className="mt-2 font-serif text-base italic leading-snug">“{english ? work.en : work.cs}”</p><div className="mt-3 h-px bg-black/10"/><p className="mt-2 text-[9px] text-black/45">{work.author} · {english ? "revision requested" : "vrátit k dopracování"}</p></div>
        <div className="absolute bottom-8 left-6 -rotate-90 font-mono text-[9px] uppercase tracking-[.22em] text-black/35 dark:text-white/35 sm:left-10">Not final · probably</div>
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2" role="group" aria-label={english ? "Choose artwork" : "Vybrat dílo"}>{works.map((item, index) => <button key={item.id} type="button" aria-pressed={active === index} aria-label={item.title} onClick={() => setActive(index)} className={`relative h-6 rounded-full p-1.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b94411] ${active === index ? "w-10" : "w-6"}`}><span className={`block h-2.5 rounded-full ${active === index ? "bg-[#b94411]" : "bg-black/25 hover:bg-black/45 dark:bg-white/25"}`}/></button>)}</div>
      </div>
    </div>
  </div>;
}