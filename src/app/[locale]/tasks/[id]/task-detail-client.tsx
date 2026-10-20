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

type Submission = {
  id: string;
  content: string | null;
  status: string;
  submittedAt: string;
  student: { id: string; name: string; email: string };
  attachments: Array<{ id: string; originalName: string; size: number; s3Url: string }>;
  evaluations: Array<{ id: string; status: string; totalPoints: number | null; evaluator: { name: string } }>;
};

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  maxPoints: number;
  deadline: string | null;
  status: string;
  subject: { name: string; class: { name: string } };
  criteria: Array<{ id: string; name: string; description: string | null; maxPoints: number }>;
  submissions: Submission[];
};

export function TaskDetailClient({ task, role, locale }: { task: TaskDetail; role: string; locale: string }) {
  const router = useRouter();
  const [content, setContent] = useState(task.submissions[0]?.content || "");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canManage = role === "ADMIN" || role === "TEACHER";

  async function submitWork() {
    setBusy(true);
    setMessage("");
    const data = new FormData();
    data.set("taskId", task.id);
    data.set("content", content);
    files.forEach((file) => data.append("files", file));
    const response = await fetch("/api/submissions", { method: "POST", body: data });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? "Práce byla odevzdána." : result.error || "Odevzdání selhalo.");
    if (response.ok) router.refresh();
  }

  async function updateStatus(status: string) {
    setBusy(true);
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  async function createEvaluation(submissionId: string) {
    setBusy(true);
    const response = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
    const result = await response.json();
    setBusy(false);
    if (response.ok) router.push(`/${locale}/evaluations/${result.evaluation.id}`);
    else setMessage(result.error || "Hodnocení se nepodařilo vytvořit.");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{task.title}</h1>
              <Badge>{task.status}</Badge>
            </div>
            <p className="text-muted-foreground">{task.subject.name} · {task.subject.class.name}</p>
          </div>
          {canManage ? (
            <div className="flex gap-2">
              {task.status !== "PUBLISHED" ? <Button onClick={() => updateStatus("PUBLISHED")} disabled={busy}>Publikovat</Button> : null}
              {task.status !== "CLOSED" ? <Button variant="outline" onClick={() => updateStatus("CLOSED")} disabled={busy}>Uzavřít</Button> : null}
            </div>
          ) : null}
        </div>

        <Card>
          <CardHeader><CardTitle>Zadání</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {task.description ? <p>{task.description}</p> : null}
            {task.instructions ? <p className="whitespace-pre-wrap">{task.instructions}</p> : null}
            <p className="text-sm text-muted-foreground">Maximum: {task.maxPoints} bodů{task.deadline ? ` · Termín: ${new Date(task.deadline).toLocaleString(locale)}` : ""}</p>
          </CardContent>
        </Card>

        {task.criteria.length ? (
          <Card>
            <CardHeader><CardTitle>Kritéria</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {task.criteria.map((criterion) => <div key={criterion.id} className="flex justify-between border-b py-2"><span>{criterion.name}</span><strong>{criterion.maxPoints} b.</strong></div>)}
            </CardContent>
          </Card>
        ) : null}

        {role === "STUDENT" ? (
          <Card>
            <CardHeader><CardTitle>Moje odevzdání</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="submission-content">Text práce</Label><Textarea id="submission-content" value={content} onChange={(event) => setContent(event.target.value)} rows={8} /></div>
              <div className="space-y-2"><Label htmlFor="submission-files">Přílohy</Label><Input id="submission-files" type="file" multiple accept=".pdf,.zip,.jpg,.jpeg,.png" onChange={(event) => setFiles(Array.from(event.target.files || []))} /></div>
              <Button onClick={submitWork} disabled={busy || task.status !== "PUBLISHED"}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Odevzdat</Button>
              {message ? <p role="status" className="text-sm">{message}</p> : null}
              {task.submissions[0]?.attachments.map((attachment) => <a key={attachment.id} href={attachment.s3Url} className="flex items-center gap-2 text-sm underline"><Paperclip className="size-4" />{attachment.originalName}</a>)}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Odevzdání ({task.submissions.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {task.submissions.map((submission) => (
                <div key={submission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                  <div><p className="font-medium">{submission.student.name}</p><p className="text-sm text-muted-foreground">{submission.student.email} · {submission.status}</p></div>
                  {submission.evaluations[0] ? <Button onClick={() => router.push(`/${locale}/evaluations/${submission.evaluations[0].id}`)}>Otevřít hodnocení</Button> : <Button onClick={() => createEvaluation(submission.id)} disabled={busy}>Začít hodnotit</Button>}
                </div>
              ))}
              {!task.submissions.length ? <p className="text-muted-foreground">Zatím bez odevzdání.</p> : null}
              {message ? <p role="status" className="text-sm">{message}</p> : null}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}