"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { attachmentUrl, PREVIEW_IMAGE_TYPES } from "@/lib/media";
import { draftFromWork, draftScores, isFullyRated, type ReviewDraft, type ReviewQueueItem, type ReviewWork } from "@/lib/review-workspace";

type SaveIntent = "draft" | "navigation" | "complete";

export function useReviewWorkspace(initial: ReviewWork, initialQueue: ReviewQueueItem[], locale: string, canEdit: boolean) {
  const router = useRouter();
  const [work, setWork] = useState(initial);
  const [queue, setQueue] = useState(initialQueue);
  const [form, setForm] = useState(() => draftFromWork(initial));
  const formRef = useRef(form);
  const cache = useRef(new Map<string, ReviewWork>([[initial.id, initial]]));
  const requests = useRef(new Map<string, Promise<ReviewWork>>());
  const imageCache = useRef(new Map<string, HTMLImageElement>());
  const saveChain = useRef<Promise<boolean>>(Promise.resolve(true));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moving = useRef(false);
  const [saving, setSaving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const persist = useCallback((intent: SaveIntent = "draft") => {
    if (timer.current) clearTimeout(timer.current);
    const expectedId = formRef.current.id;
    const operation = saveChain.current.then(async () => {
      const snapshot = formRef.current;
      if (!canEdit || snapshot.readOnly || snapshot.id !== expectedId) return true;
      const complete = intent !== "draft" && isFullyRated(snapshot);
      if (intent === "complete" && !isFullyRated(snapshot)) { setError("Nejprve ohodnoťte všechna kritéria."); return false; }
      const status = complete || (snapshot.status === "COMPLETED" && isFullyRated(snapshot)) ? "COMPLETED" : "IN_PROGRESS";
      if (snapshot.revision === snapshot.savedRevision && !(complete && snapshot.status !== "COMPLETED")) return true;
      const scores = draftScores(snapshot);
      const total = scores.reduce((sum, score) => sum + score.points, 0);
      if (total > snapshot.maxPoints || scores.some((score) => !Number.isInteger(score.points) || score.points < 0 || score.points > snapshot.limits[score.criterionId])) { setError("Zkontrolujte celé body a bodové limity."); return false; }
      setSaving(true); setError("");
      try {
        const response = await fetch(`/api/evaluations/${snapshot.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: snapshot.feedback, status, scores }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Uložení selhalo.");
        if (formRef.current.id === snapshot.id) {
          const next = { ...formRef.current, savedRevision: snapshot.revision, status };
          formRef.current = next; setForm(next);
          setQueue((items) => items.map((item) => item.id === snapshot.id ? { ...item, status, totalPoints: total } : item));
          const cached = cache.current.get(snapshot.id);
          if (cached) cache.current.set(snapshot.id, { ...cached, status, totalPoints: total, feedback: snapshot.feedback, scores });
          setMessage("Hodnocení bylo uloženo.");
        }
        return true;
      } catch (reason) { setError(reason instanceof Error ? reason.message : "Uložení selhalo. Změny zůstávají ve formuláři."); return false; }
      finally { setSaving(false); }
    });
    saveChain.current = operation.catch(() => false);
    return operation;
  }, [canEdit]);

  const change = useCallback((transform: (draft: ReviewDraft) => ReviewDraft) => {
    if (moving.current || !canEdit || formRef.current.readOnly) return;
    const next = { ...transform(formRef.current), revision: formRef.current.revision + 1 };
    formRef.current = next; setForm(next); setMessage(""); setError("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void persist("draft"); }, 650);
  }, [canEdit, persist]);

  const load = useCallback(async (id: string): Promise<ReviewWork> => {
    const cached = cache.current.get(id);
    if (cached) return cached;
    const active = requests.current.get(id);
    if (active) return active;
    const pending = (async () => {
      const response = await fetch(`/api/evaluations/${id}`);
      if (!response.ok) throw new Error("Další práci se nepodařilo načíst. Zkuste šipku znovu.");
      const result = await response.json();
      cache.current.set(id, result.evaluation);
      return result.evaluation as ReviewWork;
    })();
    requests.current.set(id, pending);
    try { return await pending; } finally { requests.current.delete(id); }
  }, []);

  const goTo = useCallback(async (id: string) => {
    if (moving.current || id === formRef.current.id) return;
    moving.current = true; setNavigating(true); setError("");
    try {
      if (!(await persist("navigation"))) return;
      const next = await load(id);
      const draft = draftFromWork(next);
      formRef.current = draft; setWork(next); setForm(draft); setMessage("");
      window.history.replaceState(null, "", `/${locale}/evaluations/${id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Práci se nepodařilo načíst."); }
    finally { moving.current = false; setNavigating(false); }
  }, [load, locale, persist]);

  const leave = useCallback(async (href: string) => {
    if (moving.current) return;
    moving.current = true; setNavigating(true);
    if (await persist("navigation")) router.push(href);
    moving.current = false; setNavigating(false);
  }, [persist, router]);

  useEffect(() => {
    const index = initialQueue.findIndex((item) => item.id === work.id);
    for (const neighbor of [initialQueue[index - 1], initialQueue[index + 1]]) {
      if (!neighbor) continue;
      void load(neighbor.id).then((item) => {
        const file = item.submission.attachments.find((attachment) => PREVIEW_IMAGE_TYPES.has(attachment.mimeType) && attachment.size < 8 * 1024 * 1024);
        if (file && !imageCache.current.has(file.id)) {
          const image = new window.Image(); image.src = attachmentUrl(file.id, "preview");
          imageCache.current.set(file.id, image);
          if (imageCache.current.size > 3) imageCache.current.delete(imageCache.current.keys().next().value!);
        }
      }).catch(() => undefined);
    }
  }, [initialQueue, load, work.id]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || document.fullscreenElement) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="combobox"]')) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const index = initialQueue.findIndex((item) => item.id === formRef.current.id);
      const next = initialQueue[index + (event.key === "ArrowRight" ? 1 : -1)];
      if (next) { event.preventDefault(); void goTo(next.id); }
    };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (formRef.current.revision !== formRef.current.savedRevision) { event.preventDefault(); event.returnValue = ""; } };
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/uploads/") || url.href === window.location.href) return;
      if (formRef.current.revision === formRef.current.savedRevision && !(formRef.current.status !== "COMPLETED" && isFullyRated(formRef.current))) return;
      event.preventDefault(); event.stopImmediatePropagation(); void leave(url.pathname + url.search);
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("keydown", keydown); window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [goTo, initialQueue, leave]);

  return { work, queue, form, saving, navigating, error, message, change, persist, goTo, leave, fullyRated: isFullyRated(form) };
}
