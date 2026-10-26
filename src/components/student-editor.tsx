"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export function StudentEditor({ student, onClose, onSaved }: { student: { id: string; name: string; email: string; externalId: string | null }; onClose: () => void; onSaved: () => Promise<void> }) {
 const [form, setForm] = useState({ name: student.name, email: student.email, externalId: student.externalId || "" });
 const [busy, setBusy] = useState(false); const [error, setError] = useState("");
 async function save(event: React.FormEvent) {
  event.preventDefault(); setBusy(true); setError("");
  try { const response = await fetch("/api/students/" + student.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, externalId: form.externalId.trim() || null }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await onSaved(); onClose(); }
  catch (reason) { setError(reason instanceof Error ? reason.message : "Úprava selhala."); } finally { setBusy(false); }
 }
 return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Upravit studenta</DialogTitle></DialogHeader><form onSubmit={(event) => void save(event)} className="space-y-4"><fieldset disabled={busy} className="space-y-4"><div className="space-y-1"><Label htmlFor="student-name">Jméno studenta</Label><Input id="student-name" required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="space-y-1"><Label htmlFor="student-email">E-mail studenta</Label><Input id="student-email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div className="space-y-1"><Label htmlFor="student-external">Školní ID</Label><Input id="student-external" value={form.externalId} maxLength={100} pattern="[A-Za-z0-9]*" onChange={(event) => setForm({ ...form, externalId: event.target.value })} /><p className="text-xs text-muted-foreground">Párování importu podle názvu, např. 4464341_02.jpg. Prázdné pole znamená bez ID.</p></div>{error ? <p role="alert" className="text-destructive">{error}</p> : null}<div className="flex gap-3"><Button type="submit">{busy ? "Ukládání…" : "Uložit studenta"}</Button><Button type="button" variant="outline" onClick={onClose}>Zrušit</Button></div></fieldset></form></DialogContent></Dialog>;
}
