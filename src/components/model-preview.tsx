"use client";
import { useEffect, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";
import type { ModelViewerElement } from "@google/model-viewer";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { attachmentUrl } from "@/lib/media";

declare module "react" {
 // eslint-disable-next-line @typescript-eslint/no-namespace -- React custom elements require JSX namespace augmentation.
 namespace JSX {
  interface IntrinsicElements {
   "model-viewer": DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & { src: string; alt: string; "camera-controls"?: boolean; "touch-action"?: string; "interaction-prompt-style"?: string };
  }
 }
}

export default function ModelPreview({ id, name }: { id: string; name: string }) {
  const t = useTranslations("modelPreview");
  const viewer = useRef<ModelViewerElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [animations, setAnimations] = useState<string[]>([]);
  const [animation, setAnimation] = useState("");
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const node = viewer.current;
    if (!node) return;
    let active = true;
    const loaded = () => {
      const names = node.availableAnimations;
      setReady(true); setAnimations(names); setAnimation(names[0] || "");
      if (names.length) { node.animationName = names[0]; node.play({ repetitions: Infinity, pingpong: false }); node.pause(); node.currentTime = 0; }
      setDuration(node.duration || 0);
    };
    const failed = () => setError(true);
    const finished = () => setPlaying(false);
    node.addEventListener("load", loaded); node.addEventListener("error", failed); node.addEventListener("finished", finished);
    void import("@google/model-viewer").catch(() => { if (active) setError(true); });
    return () => { active = false; node.removeEventListener("load", loaded); node.removeEventListener("error", failed); node.removeEventListener("finished", finished); };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => { if (viewer.current) setTime(viewer.current.currentTime); }, 100);
    return () => window.clearInterval(timer);
  }, [playing]);
  function togglePlay() {
    const node = viewer.current; if (!node) return;
    if (playing) node.pause(); else { if (node.currentTime >= node.duration) node.currentTime = 0; node.play({ repetitions: loop ? Infinity : 1, pingpong: false }); }
    setDuration(node.duration || 0); setPlaying(!playing);
  }
  return <div className="relative flex h-full min-h-64 flex-col gap-2">
    {error ? <div role="alert" className="m-auto space-y-3 p-5 text-center"><p>{t("error")}</p><a className="underline" href={attachmentUrl(id)}>{t("download")}</a></div> : <>
      {!ready ? <p role="status" className="absolute inset-x-0 top-4 z-10 text-center text-sm">{t("loading")}</p> : null}
      <model-viewer ref={viewer} src={attachmentUrl(id, "preview")} alt={name} camera-controls touch-action="pan-y" interaction-prompt-style="basic" style={{ width: "100%", flex: "1 1 0%", minHeight: 180, background: "#202124" }} />
      <div className="flex flex-wrap items-center gap-3 px-2 text-xs"><span>{t("controls")}</span><Button type="button" size="sm" variant="secondary" disabled={!ready} onClick={() => { const node = viewer.current; if (node) { node.cameraOrbit = "0deg 75deg auto"; node.cameraTarget = "auto auto auto"; node.fieldOfView = "auto"; node.jumpCameraToGoal(); } }}>{t("reset")}</Button></div>
      {animations.length ? <div className="flex flex-wrap items-center gap-3 p-2"><label className="text-xs">{t("animation")}<select aria-label={t("animation")} className="ml-2 max-w-52 rounded border bg-slate-900 p-1 text-white" value={animation} onChange={(event) => { const node = viewer.current; if (!node) return; node.pause(); node.animationName = event.target.value; node.play({ repetitions: Infinity, pingpong: false }); node.pause(); node.currentTime = 0; setAnimation(event.target.value); setPlaying(false); setTime(0); setDuration(node.duration || 0); }}>{animations.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><Button type="button" size="sm" variant="secondary" onClick={togglePlay}>{t(playing ? "pause" : "play")}</Button><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={loop} onChange={(event) => { setLoop(event.target.checked); viewer.current?.pause(); setPlaying(false); }} />{t("loop")}</label><label className="flex min-w-40 flex-1 items-center gap-2 text-xs">{t("time")}<input className="min-w-20 flex-1" type="range" aria-label={t("time")} min={0} max={duration || 1} step={0.01} value={Math.min(time, duration || 1)} onChange={(event) => { const node = viewer.current; if (!node) return; node.pause(); node.currentTime = Math.min(Number(event.target.value), Math.max(0, node.duration - 0.000001)); setTime(node.currentTime); setPlaying(false); }} /><span className="tabular-nums">{time.toFixed(1)} / {duration.toFixed(1)} s</span></label></div> : null}
    </>}
  </div>;
}
