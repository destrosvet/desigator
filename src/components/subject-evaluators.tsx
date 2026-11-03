"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Evaluator = { id: string; name: string; email: string; institution: string | null };
export function SubjectEvaluators({ subjectId }: { subjectId: string }) {
  const [data, setData] = useState<{ assigned: Evaluator[]; available: Evaluator[] }>();
  const [evaluatorId, setEvaluatorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/subjects/${subjectId}/evaluators`);
    if (!response.ok) throw new Error("Hodnotitele se nepodařilo načíst.");
    return await response.json() as { assigned: Evaluator[]; available: Evaluator[] };
  }, [subjectId]);
  useEffect(() => {
    let cancelled = false;
    void load().then(result => { if (!cancelled) setData(result); }).catch(error => { if (!cancelled) setMessage(error.message); });
    return () => { cancelled = true; };
  }, [load]);
  async function assign() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/subjects/${subjectId}/evaluators`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evaluatorId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Přiřazení selhalo.");
      setData(await load()); setEvaluatorId(""); setMessage("Hodnotitel byl přiřazen k předmětu.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Přiřazení selhalo."); }
    finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Hodnotitelé předmětu</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Přiřazený hodnotitel najde v sekci Hodnocení finální práce ze všech zveřejněných a uzavřených zadání tohoto předmětu a počet zbývajících hodnocení. Automaticky se zahrnou i nové práce. Předmět nemůže upravovat.</p>
    {data?.assigned.length ? <ul className="space-y-2">{data.assigned.map(person => <li key={person.id}><strong>{person.name}</strong> <span className="text-sm text-muted-foreground">{person.email}{person.institution ? ` · ${person.institution}` : ""}</span></li>)}</ul> : <p className="text-sm">{data ? "Zatím není přiřazen žádný hodnotitel." : "Načítání…"}</p>}
    <div className="space-y-2"><Label htmlFor="subject-evaluator">Přidat hodnotitele</Label><select id="subject-evaluator" value={evaluatorId} onChange={event => setEvaluatorId(event.target.value)} disabled={busy || !data} className="h-10 w-full rounded border bg-background px-2"><option value="">Vyberte hodnotitele</option>{data?.available.filter(person => !data.assigned.some(a => a.id === person.id)).map(person => <option key={person.id} value={person.id}>{person.name} · {person.email}{person.institution ? ` · ${person.institution}` : ""}</option>)}</select></div>
    <Button disabled={busy || !evaluatorId} onClick={() => void assign()}>Přiřadit k předmětu</Button>
    {message ? <p role="status">{message}</p> : null}
  </CardContent></Card>;
}
