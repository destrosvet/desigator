"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function VerifyEmailPage() {
  const { locale } = useParams<{ locale: string }>();
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function submit(resend: boolean) {
    setBusy(true); setError(""); setMessage("");
    try {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
      const response = await fetch(resend ? "/api/auth/resend-verification" : "/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resend ? { email, locale } : { token }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      if (resend) setMessage(result.message); else { setVerified(true); window.history.replaceState(null, "", window.location.pathname); }
    } catch (e) { setError(e instanceof Error ? e.message : "Ověření selhalo."); }
    finally { setBusy(false); }
  }
  return <div className="flex min-h-screen items-center justify-center p-4"><Card className="w-full max-w-lg"><CardHeader><CardTitle>{verified ? "E-mail byl ověřen" : "Ověření e-mailu"}</CardTitle></CardHeader><CardContent className="space-y-5">{verified ? <><p>Účet je připravený. Nyní se můžete přihlásit.</p><Button asChild><Link href="/auth/login">Přihlásit se</Link></Button></> : <><p className="text-sm">Pro aktivaci účtu otevřete odkaz z e-mailu a potvrďte adresu. Odkaz platí 24 hodin.</p><Button disabled={busy} onClick={() => void submit(false)}>{busy ? "Ověřování…" : "Potvrdit e-mail"}</Button><form className="space-y-3 border-t pt-4" onSubmit={(event) => { event.preventDefault(); void submit(true); }}><Label htmlFor="verification-email">E-mail účtu</Label><Input id="verification-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /><Button variant="outline" disabled={busy}>Poslat nový ověřovací odkaz</Button></form></>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}</CardContent></Card></div>;
}
