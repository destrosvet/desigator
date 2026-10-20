"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface BulkResult {
  filename: string;
  status: "success" | "student_not_found" | "error";
  studentName?: string;
  externalId?: string;
  message?: string;
}

export default function BulkUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [taskId, setTaskId] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [summary, setSummary] = useState({ total: 0, success: 0, notFound: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Načíst tasky při mount
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks || []));
  }, []);

  const handleUpload = async () => {
    if (!taskId || !files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("taskId", taskId);
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch("/api/submissions/bulk-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResults(data.results || []);
      setSummary(data.summary || { total: 0, success: 0, notFound: 0, errors: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const canUpload = session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER";

  if (!canUpload) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">K této stránce nemáte přístup.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hromadné nahrání odevzdání</h1>
          <p className="text-muted-foreground mt-1">
            Nahrajte soubory pro více studentů najednou. Název souboru musí obsahovat externalId studenta (např. <code>S001_obrazek.jpg</code>).
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle>Výběr zadání a souborů</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Zadání (Task)</Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger><SelectValue placeholder="Vyberte zadání" /></SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Soubory</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.zip"
                onChange={(e) => setFiles(e.target.files)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {files && files.length > 0 && (
                <p className="text-sm text-muted-foreground">Vybráno {files.length} souborů</p>
              )}
            </div>

            <Button onClick={handleUpload} disabled={uploading || !taskId || !files} className="w-full">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? "Nahrávání..." : "Nahrát soubory"}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Výsledky
                <Badge variant="default" className="bg-green-100 text-green-800">{summary.success} úspěchů</Badge>
                {summary.notFound > 0 && <Badge variant="secondary" className="bg-orange-100 text-orange-800">{summary.notFound} nenalezeno</Badge>}
                {summary.errors > 0 && <Badge variant="destructive">{summary.errors} chyb</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Soubor</TableHead>
                    <TableHead>ExternalId</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Zpráva</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.filename}</TableCell>
                      <TableCell>{r.externalId || "-"}</TableCell>
                      <TableCell>{r.studentName || "-"}</TableCell>
                      <TableCell>
                        {r.status === "success" && <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />OK</Badge>}
                        {r.status === "student_not_found" && <Badge variant="secondary" className="bg-orange-100 text-orange-800"><AlertCircle className="w-3 h-3 mr-1" />Nenalezen</Badge>}
                        {r.status === "error" && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Chyba</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.message || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
