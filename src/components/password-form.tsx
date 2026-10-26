"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { newPasswordSchema } from "@/lib/password-policy";
import { Link } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "change" | "forgot" | "reset";
const errorCodes = ["invalidInput", "invalidToken", "wrongPassword", "samePassword", "unauthorized", "tooManyAttempts", "emailUnavailable", "serverError"];
export function PasswordForm({ mode }: { mode: Mode }) {
  const t = useTranslations("passwords");
  const locale = useLocale();
  const Heading = mode === "change" ? "h2" : "h1";
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (mode !== "forgot" && password !== confirmation) { setError(t("errors.mismatch")); return; }
    if (mode !== "forgot" && !newPasswordSchema.safeParse(password).success) { setError(t("errors.invalidInput")); return; }
    setBusy(true);
    try {
      const token = mode === "reset" ? new URLSearchParams(window.location.hash.slice(1)).get("token") || "" : "";
      const body = mode === "forgot" ? { email, locale } : mode === "reset" ? { password, token } : { password, currentPassword };
      const response = await fetch("/api/auth/" + mode + "-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { const code = errorCodes.includes(result.error) ? result.error : "serverError"; setError(t("errors." + code)); return; }
      setPassword(""); setConfirmation(""); setCurrentPassword(""); setDone(true);
      if (mode === "reset") window.history.replaceState(null, "", window.location.pathname);
      if (mode === "change") await signOut({ callbackUrl: "/" + locale + "/auth/login" });
    } catch { setError(t("errors.serverError")); } finally { setBusy(false); }
  }
  return <Card className="w-full max-w-xl"><CardHeader><CardTitle><Heading>{t(mode + "Title")}</Heading></CardTitle><CardDescription>{t(mode === "forgot" ? "forgotDescription" : "description")}</CardDescription></CardHeader><CardContent>
    {done ? <p role="status" className="mb-4">{t(mode === "forgot" ? "resetRequested" : "passwordReset")}</p> : <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <fieldset disabled={busy} className="space-y-4">
        {mode === "forgot" ? <div className="space-y-2"><Label htmlFor="recovery-email">{t("email")}</Label><Input id="recovery-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></div> : <>
          {mode === "change" ? <div className="space-y-2"><Label htmlFor="current-password">{t("currentPassword")}</Label><Input id="current-password" type="password" autoComplete="current-password" maxLength={1024} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div> : null}
          <div className="space-y-2"><Label htmlFor="new-password">{t("newPassword")}</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="confirm-password">{t("confirmPassword")}</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
        </>}
        <Button type="submit">{busy ? t("busy") : t(mode + "Submit")}</Button>
      </fieldset>
    </form>}
    {mode !== "change" ? <div className="mt-5 flex flex-wrap gap-4 text-sm"><Link href="/auth/login" className="underline">{t("login")}</Link>{mode === "reset" ? <Link href="/auth/forgot-password" className="underline">{t("forgotLink")}</Link> : null}</div> : null}
  </CardContent></Card>;
}
