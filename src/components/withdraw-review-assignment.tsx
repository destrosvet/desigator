"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

export function WithdrawReviewAssignment({ subjectId, evaluatorId }: { subjectId: string; evaluatorId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function withdraw() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/subjects/${subjectId}/evaluators`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evaluatorId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Odebrání selhalo.");
      router.push(`/${locale}/evaluations`);
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Odebrání selhalo."); }
    finally { setBusy(false); }
  }
  return <div className="mb-4 space-y-2 rounded-lg border p-3"><Button variant="outline" disabled={busy} onClick={() => void withdraw()}>Zrušit moje přiřazení k předmětu</Button><p className="text-xs text-muted-foreground">Odebere nevyplněná hodnocení v celém předmětu a zastaví přiřazování nových prací. Rozpracovaná a dokončená hodnocení zůstanou zachována.</p>{error ? <p role="alert">{error}</p> : null}</div>;
}
