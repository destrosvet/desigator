"use client";

import { useCallback, useRef, useState } from "react";
import { Download, FileImage, File, Maximize, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attachmentUrl, PREVIEW_IMAGE_TYPES, type WorkAttachment } from "@/lib/media";

export function WorkViewer({ attachments, compact = false }: { attachments: WorkAttachment[]; compact?: boolean }) {
  const [selectedId, setSelectedId] = useState(() => attachments.find((file) => PREVIEW_IMAGE_TYPES.has(file.mimeType))?.id || attachments[0]?.id);
  const selected = attachments.find((file) => file.id === selectedId) || attachments[0];
  const [zoom, setZoom] = useState(1);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [fullscreenError, setFullscreenError] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const isImage = selected && PREVIEW_IMAGE_TYPES.has(selected.mimeType);
  const imageRef = useCallback((node: HTMLImageElement | null) => {
    // A cached image can finish before React hydrates its onLoad handler.
    if (node?.complete && node.naturalWidth > 0) setLoadedId(selected?.id ?? null);
    else if (node?.complete && node.currentSrc) setFailedId(selected?.id ?? null);
  }, [selected?.id]);

  function selectFile(id: string) {
    setSelectedId(id);
    setZoom(1);
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
          <Button variant="ghost" size="icon" aria-label="Oddálit obrázek" disabled={!isImage || zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}><ZoomOut className="size-4" /></Button>
          <span className="w-12 text-center text-xs tabular-nums" aria-label="Přiblížení">{Math.round(zoom * 100)} %</span>
          <Button variant="ghost" size="icon" aria-label="Přiblížit obrázek" disabled={!isImage || zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + 0.25))}><ZoomIn className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Obnovit přiblížení" disabled={!isImage} onClick={() => setZoom(1)}><RotateCcw className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Celá obrazovka" onClick={toggleFullscreen}><Maximize className="size-4" /></Button>
          <Button variant="ghost" size="icon" asChild><a href={attachmentUrl(selected.id)} aria-label={`Stáhnout ${selected.originalName}`}><Download className="size-4" /></a></Button>
        </div>
      </div>
      <div className={compact ? "relative h-[clamp(180px,calc(100dvh-340px),800px)] overflow-auto p-2 fullscreen:flex-1" : "relative min-h-[420px] flex-1 overflow-auto p-4 lg:min-h-[560px]"} data-testid="work-preview">
        {isImage && failedId !== selected.id ? <>
          {loadedId !== selected.id ? <p className="absolute inset-x-0 top-8 text-center text-sm text-slate-400">Načítání náhledu…</p> : null}
          {compact ? <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} className="mx-auto"><img ref={imageRef} key={selected.id} src={attachmentUrl(selected.id, "preview")} alt={selected.originalName} onLoad={() => setLoadedId(selected.id)} onError={() => setFailedId(selected.id)} className="block h-full w-full object-contain" /></div> : <img ref={imageRef} key={selected.id} src={attachmentUrl(selected.id, "preview")} alt={selected.originalName} onLoad={() => setLoadedId(selected.id)} onError={() => setFailedId(selected.id)} className="mx-auto block h-auto max-w-none rounded-sm" style={{ width: `${zoom * 100}%` }} />}
        </> : <div className="flex min-h-80 flex-col items-center justify-center gap-4 p-8 text-center"><File className="size-12 text-slate-500" /><p>{failedId === selected.id ? "Náhled se nepodařilo načíst." : "Pro tento formát zatím není náhled dostupný."}</p><p className="max-w-sm text-sm text-slate-400">Originální soubor si můžete stáhnout a otevřít v odpovídající aplikaci.</p><Button variant="secondary" asChild><a href={attachmentUrl(selected.id)}><Download className="mr-2 size-4" />Stáhnout originál</a></Button>{failedId === selected.id ? <Button variant="ghost" onClick={() => { setFailedId(null); setLoadedId(null); }}>Zkusit znovu</Button> : null}</div>}
      </div>
      {fullscreenError ? <p role="alert" className="px-4 pb-3 text-sm">{fullscreenError}</p> : null}
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Soubory práce">
      {attachments.map((file, index) => <button key={file.id} type="button" onClick={() => selectFile(file.id)} aria-label={`Zobrazit ${file.originalName}`} aria-pressed={file.id === selected.id} title={file.originalName} className={`${compact ? "flex w-20 items-center gap-1" : "w-32"} shrink-0 overflow-hidden rounded-lg border text-left focus-visible:outline-2 focus-visible:outline-primary ${file.id === selected.id ? "border-primary ring-1 ring-primary" : "border-border"}`}>
        {PREVIEW_IMAGE_TYPES.has(file.mimeType) ? <img src={attachmentUrl(file.id, "thumbnail")} alt="" loading="lazy" className={compact ? "h-9 w-12 bg-muted object-contain" : "h-20 w-full bg-muted object-contain"} /> : <div className={`flex items-center justify-center bg-muted ${compact ? "h-9 w-12" : "h-20"}`}><File className="size-5 text-muted-foreground" /></div>}
        <span className={compact ? "px-1 text-xs tabular-nums" : "block truncate px-2 py-2 text-xs"}>{compact ? index + 1 : file.originalName}</span>
      </button>)}
    </div>
  </div>;
}
