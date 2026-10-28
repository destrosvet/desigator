"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refresh server data without losing the table search or an open preview.
export function useLiveResultsRefresh(enabled = true) {
 const router = useRouter();
 useEffect(() => {
  if (!enabled) return;
  let lastRefresh = 0;
  const refresh = () => {
   const now = Date.now();
   if (document.visibilityState !== "visible" || now - lastRefresh < 1000) return;
   lastRefresh = now; router.refresh();
  };
  const timer = window.setInterval(refresh, 30000);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
 }, [enabled, router]);
}
