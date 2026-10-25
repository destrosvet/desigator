"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function InvitationPage() {
  const { token, locale } = useParams<{ token: string; locale: string }>();
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const callback = encodeURIComponent("/" + locale + "/invitations/" + token);
  async function accept() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/organization/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await update(); router.push("/" + locale + "/settings?section=school"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Přijetí pozvánky selhalo."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-lg p-6 pt-20"><Card><CardHeader><CardTitle>Pozvánka do školy</CardTitle></CardHeader><CardContent className="space-y-4"><p>Pozvánku může přijmout pouze účet s e-mailem, pro který ji správce vystavil.</p>{status === "loading" ? <p>Načítání…</p> : session ? <><p>Přihlášený účet: {session.user.email}</p><Button disabled={busy} onClick={() => void accept()}>Přijmout pozvánku</Button></> : <div className="flex gap-4"><a className="underline" href={"/" + locale + "/auth/login?callbackUrl=" + callback}>Přihlásit se</a><a className="underline" href={"/" + locale + "/auth/register?callbackUrl=" + callback}>Vytvořit účet</a></div>}{message ? <p role="alert">{message}</p> : null}</CardContent></Card></main>;
}
