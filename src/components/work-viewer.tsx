"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Download, FileImage, File, Maximize, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attachmentUrl, PREVIEW_MODEL_TYPES, PREVIEW_DOCUMENT_TYPES, PREVIEW_IMAGE_TYPES, PREVIEW_VIDEO_TYPES, type WorkAttachment } from "@/lib/media";

const ModelPreview = dynamic(() => import("@/components/model-preview"), { ssr: false });

export function WorkViewer({ attachments, compact = false }: { attachments: WorkAttachment[]; compact?: boolean }) {
  const [selectedId, setSelectedId] = useState(() => attachments.find((file) => PREVIEW_IMAGE_TYPES.has(file.mimeType))?.id || attachments[0]?.id);
  const selected = attachments.find((file) => file.id === selectedId) || attachments[0];
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const viewport = useRef<HTMLDivElement>(null);
  const imageCanvas = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ x: number; y: number; u: number; v: number } | null>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [fullscreenError, setFullscreenError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const isModel = selected && PREVIEW_MODEL_TYPES.has(selected.mimeType);
  const isDocument = selected && PREVIEW_DOCUMENT_TYPES.has(selected.mimeType);
  const isVideo = selected && PREVIEW_VIDEO_TYPES.has(selected.mimeType);
  const isImage = selected && PREVIEW_IMAGE_TYPES.has(selected.mimeType);
  const imageRef = useCallback((node: HTMLImageElement | null) => {
    // A cached image can finish before React hydrates its onLoad handler.
    if (node?.complete && node.naturalWidth > 0) setLoadedId(selected?.id ?? null);
    else if (node?.complete && node.currentSrc) setFailedId(selected?.id ?? null);
  }, [selected?.id]);

  const changeZoom = useCallback((value: number, point?: { x: number; y: number }) => {
    const node = viewport.current; const canvas = imageCanvas.current;
    const next = Math.max(0.5, Math.min(8, value));
    if (!node || !canvas || next === zoomRef.current) return;
    const bounds = node.getBoundingClientRect(); const rect = canvas.getBoundingClientRect();
    const x = point?.x ?? bounds.left + node.clientWidth / 2;
    const y = point?.y ?? bounds.top + node.clientHeight / 2;
    anchor.current = { x, y, u: (x - rect.left) / rect.width, v: (y - rect.top) / rect.height };
    zoomRef.current = next; setZoom(next);
  }, []);

  useLayoutEffect(() => {
    const point = anchor.current; const node = viewport.current; const canvas = imageCanvas.current;
    if (point && node && canvas) {
      const rect = canvas.getBoundingClientRect();
      node.scrollLeft += rect.left + point.u * rect.width - point.x;
      node.scrollTop += rect.top + point.v * rect.height - point.y;
      anchor.current = null;
    }
  }, [zoom]);

  useLayoutEffect(() => {
    viewport.current?.scrollTo(0, 0); drag.current = null;
  }, [selected?.id]);

  useEffect(() => {
    const node = viewport.current;
    if (!node || !isImage) return;
    const wheel = (event: WheelEvent) => {
      if (!imageCanvas.current || !event.deltaY) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1);
      changeZoom(zoomRef.current * Math.exp(-Math.max(-500, Math.min(500, delta)) * 0.002), { x: event.clientX, y: event.clientY });
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [changeZoom, isImage, selected?.id]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  function selectFile(id: string) {
    setSelectedId(id);
    anchor.current = null; zoomRef.current = 1; setZoom(1); setPanning(false);
    setFullscreenError("");
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch { setFullscreenError("Zobrazení na celou obrazovku není dostupné."); }
  }

  if (!selected) return <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center text-muted-foreground"><FileImage className="size-10" /><p>Práce neobsahuje žádné soubory.</p><p className="text-sm">Textové odevzdání najdete pod prohlížečem.</p></div>;

  return <div className={compact ? "space-y-1.5" : "space-y-3"}>
    <div ref={stage} className="flex flex-col overflow-hidden rounded-xl border bg-slate-950 text-slate-100 fullscreen:h-screen">
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 ${compact ? "py-1" : "py-2"}`}>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" title={selected.originalName}>{selected.originalName}</p><p className="text-xs text-slate-400">{Math.max(1, Math.round(selected.size / 1024))} KB · {attachments.findIndex((file) => file.id === selected.id) + 1} / {attachments.length}</p></div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Oddálit obrázek" disabled={!isImage || zoom <= 0.5} onClick={() => changeZoom(zoomRef.current - 0.25)}><ZoomOut className="size-4" /></Button>
          <span className="w-12 text-center text-xs tabular-nums" aria-label="Přiblížení">{Math.round(zoom * 100)} %</span>
          <Button variant="ghost" size="icon" aria-label="Přiblížit obrázek" disabled={!isImage || zoom >= 8} onClick={() => changeZoom(zoomRef.current + 0.25)}><ZoomIn className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Obnovit přiblížení" disabled={!isImage} onClick={() => { anchor.current = null; zoomRef.current = 1; setZoom(1); viewport.current?.scrollTo(0, 0); }}><RotateCcw className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Celá obrazovka" onClick={toggleFullscreen}><Maximize className="size-4" /></Button>
          <Button variant="ghost" size="icon" asChild><a href={attachmentUrl(selected.id)} aria-label={`Stáhnout ${selected.originalName}`}><Download className="size-4" /></a></Button>
        </div>
      </div>
      <div ref={viewport} className={"relative overflow-auto overscroll-contain p-2 " + (fullscreen ? "h-auto min-h-0 max-h-none flex-1" : compact ? "h-[clamp(180px,calc(100dvh-340px),800px)]" : "h-[70dvh] min-h-[320px] max-h-[900px]")} style={{ cursor: isImage ? panning ? "grabbing" : "grab" : undefined, touchAction: isImage ? "none" : undefined }} data-testid="work-preview"
        onPointerDown={(event) => {
          if (!isImage || !imageCanvas.current || (event.button !== 0 && event.button !== 1)) return;
          event.preventDefault(); const node = event.currentTarget;
          drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop };
          node.setPointerCapture(event.pointerId); setPanning(true);
        }}
        onPointerMove={(event) => {
          const current = drag.current; if (!current || current.pointerId !== event.pointerId) return;
          event.preventDefault(); event.currentTarget.scrollLeft = current.left + current.x - event.clientX; event.currentTarget.scrollTop = current.top + current.y - event.clientY;
        }}
        onPointerUp={(event) => { if (drag.current?.pointerId === event.pointerId) { drag.current = null; setPanning(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } }}
        onPointerCancel={() => { drag.current = null; setPanning(false); }}
        onLostPointerCapture={() => { drag.current = null; setPanning(false); }}
        onAuxClick={(event) => { if (isImage && event.button === 1) event.preventDefault(); }}
      >
        {isModel ? <ModelPreview key={selected.id} id={selected.id} name={selected.originalName} /> : isDocument && failedId !== selected.id ? <iframe key={selected.id} src={attachmentUrl(selected.id, "preview")} title={`PDF: ${selected.originalName}`} className="h-full min-h-64 w-full rounded bg-white" onError={() => setFailedId(selected.id)} /> : isVideo && failedId !== selected.id ? <video key={selected.id} src={attachmentUrl(selected.id, "preview")} controls loop playsInline preload="metadata" aria-label={selected.originalName} onError={() => setFailedId(selected.id)} className="mx-auto h-full max-h-[70vh] w-full object-contain" /> : isImage && failedId !== selected.id ? <>
          {loadedId !== selected.id ? <p className="absolute inset-x-0 top-8 text-center text-sm text-slate-400">Načítání náhledu…</p> : null}
          <div ref={imageCanvas} style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} className="mx-auto select-none"><img ref={imageRef} key={selected.id} src={attachmentUrl(selected.id, "preview")} alt={selected.originalName} draggable={false} onLoad={() => setLoadedId(selected.id)} onError={() => setFailedId(selected.id)} className="block h-full w-full max-w-none object-contain" /></div>
        </> : <div className="flex min-h-80 flex-col items-center justify-center gap-4 p-8 text-center"><File className="size-12 text-slate-500" /><p>{failedId === selected.id ? "Náhled se nepodařilo načíst." : "Pro tento formát zatím není náhled dostupný."}</p><p className="max-w-sm text-sm text-slate-400">Originální soubor si můžete stáhnout a otevřít v odpovídající aplikaci.</p><Button variant="secondary" asChild><a href={attachmentUrl(selected.id)}><Download className="mr-2 size-4" />Stáhnout originál</a></Button>{failedId === selected.id ? <Button variant="ghost" onClick={() => { setFailedId(null); setLoadedId(null); }}>Zkusit znovu</Button> : null}</div>}
      </div>
      {fullscreenError ? <p role="alert" className="px-4 pb-3 text-sm">{fullscreenError}</p> : null}
    </div>
    {isDocument ? <p className="text-xs text-muted-foreground">PDF můžete procházet a přibližovat ovládáním prohlížeče. Pokud se náhled nezobrazí, stáhněte originál tlačítkem v záhlaví.</p> : null}
    {isImage ? <p className="text-[11px] text-muted-foreground">Kolečko myši: přiblížení v místě kurzoru · tažení levým nebo prostředním tlačítkem: posun · obnovit: 100 %</p> : null}
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Soubory práce">
      {attachments.map((file, index) => <button key={file.id} type="button" onClick={() => selectFile(file.id)} aria-label={`Zobrazit ${file.originalName}`} aria-pressed={file.id === selected.id} title={file.originalName} className={`${compact ? "flex w-20 items-center gap-1" : "w-32"} shrink-0 overflow-hidden rounded-lg border text-left focus-visible:outline-2 focus-visible:outline-primary ${file.id === selected.id ? "border-primary ring-1 ring-primary" : "border-border"}`}>
        {PREVIEW_IMAGE_TYPES.has(file.mimeType) ? <img src={attachmentUrl(file.id, "thumbnail")} alt="" loading="lazy" className={compact ? "h-9 w-12 bg-muted object-contain" : "h-20 w-full bg-muted object-contain"} /> : <div className={`flex items-center justify-center bg-muted ${compact ? "h-9 w-12" : "h-20"}`}><File className="size-5 text-muted-foreground" /></div>}
        <span className={compact ? "px-1 text-xs tabular-nums" : "block truncate px-2 py-2 text-xs"}>{compact ? index + 1 : file.originalName}</span>
      </button>)}
    </div>
  </div>;
}
