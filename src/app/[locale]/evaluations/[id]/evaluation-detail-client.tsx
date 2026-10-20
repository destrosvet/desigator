"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip } from "lucide-react";

type EvaluationDetail = {
  id: string;
  status: string;
  totalPoints: number | null;
  feedback: string | null;
  evaluator: { name: string };
  scores: Array<{ criterionId: string; points: number; comment: string | null }>;
  submission: {
    content: string | null;
    student: { name: string; email: string };
    attachments: Array<{ id: string; originalName: string; s3Url: string }>;
    task: {
      title: string;
      maxPoints: number;
      criteria: Array<{ id: string; name: string; description: string | null; maxPoints: number }>;
    };
  };
};

export function EvaluationDetailClient({ evaluation, role }: { evaluation: EvaluationDetail; role: string }) {
  const router = useRouter();
  const canEdit = role !== "STUDENT";
  const initialScores = new Map(evaluation.scores.map((score) => [score.criterionId, score]));
  const [feedback, setFeedback] = useState(evaluation.feedback || "");
  const [scores, setScores] = useState<Record<string, { points: number; comment: string }>>(
    Object.fromEntries(evaluation.submission.task.criteria.map((criterion) => [
      criterion.id,
      { points: initialScores.get(criterion.id)?.points || 0, comment: initialScores.get(criterion.id)?.comment || "" },
    ]))
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const total = Object.values(scores).reduce((sum, score) => sum + score.points, 0);

  async function save(status: "IN_PROGRESS" | "COMPLETED") {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/evaluations/${evaluation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feedback,
        status,
        scores: Object.entries(scores).map(([criterionId, score]) => ({ criterionId, points: score.points, comment: score.comment || null })),
      }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? "Hodnocení bylo uloženo." : result.error || "Uložení selhalo.");
    if (response.ok) router.refresh();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-3xl font-bold">{evaluation.submission.task.title}</h1><Badge>{evaluation.status}</Badge></div>
          <p className="text-muted-foreground">{evaluation.submission.student.name} · {evaluation.submission.student.email}</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Odevzdaná práce</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {evaluation.submission.content ? <p className="whitespace-pre-wrap">{evaluation.submission.content}</p> : <p className="text-muted-foreground">Bez textového obsahu.</p>}
            {evaluation.submission.attachments.map((attachment) => <a key={attachment.id} href={attachment.s3Url} className="flex items-center gap-2 underline"><Paperclip className="size-4" />{attachment.originalName}</a>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Bodování</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {evaluation.submission.task.criteria.map((criterion) => (
              <fieldset key={criterion.id} className="space-y-2 rounded-lg border p-4" disabled={!canEdit}>
                <div className="flex items-center justify-between"><Label htmlFor={`points-${criterion.id}`}>{criterion.name}</Label><span className="text-sm">max. {criterion.maxPoints}</span></div>
                {criterion.description ? <p className="text-sm text-muted-foreground">{criterion.description}</p> : null}
                <Input id={`points-${criterion.id}`} type="number" min={0} max={criterion.maxPoints} value={scores[criterion.id]?.points || 0} onChange={(event) => setScores((current) => ({ ...current, [criterion.id]: { ...current[criterion.id], points: Math.min(criterion.maxPoints, Math.max(0, Number(event.target.value))) } }))} />
                <Textarea aria-label={`Komentář ke kritériu ${criterion.name}`} placeholder="Komentář" value={scores[criterion.id]?.comment || ""} onChange={(event) => setScores((current) => ({ ...current, [criterion.id]: { ...current[criterion.id], comment: event.target.value } }))} />
              </fieldset>
            ))}
            <p className="text-xl font-semibold">Celkem: {canEdit ? total : evaluation.totalPoints ?? 0} / {evaluation.submission.task.maxPoints}</p>
            <div className="space-y-2"><Label htmlFor="feedback">Celková zpětná vazba</Label><Textarea id="feedback" value={feedback} onChange={(event) => setFeedback(event.target.value)} disabled={!canEdit} rows={6} /></div>
            {canEdit ? <div className="flex gap-2"><Button variant="outline" onClick={() => save("IN_PROGRESS")} disabled={busy}>Uložit koncept</Button><Button onClick={() => save("COMPLETED")} disabled={busy}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Dokončit hodnocení</Button></div> : null}
            {message ? <p role="status" className="text-sm">{message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}