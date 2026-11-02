"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "@/components/navigation";
import { GraduationCap, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const params = useParams();
  const locale = params.locale as string;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, locale }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registrace selhala");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Registrace selhala");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Desigator</CardTitle>
          <CardDescription>{t("title")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription>{locale === "en" ? "Check your inbox and confirm your email. You can sign in after verification." : "Poslali jsme ověřovací e-mail. Otevřete odkaz a potvrďte adresu; poté se můžete přihlásit."}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">{locale === "en" ? "Use at least 8 characters. Registration must be confirmed by email." : "Heslo musí mít alespoň 8 znaků. Registraci je nutné potvrdit e-mailem."}</p>
            <Button type="submit" className="w-full" disabled={loading || success}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("submit")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm"><Link href="/auth/verify-email" className="text-primary hover:underline">{locale === "en" ? "Resend verification email" : "Poslat znovu ověřovací e-mail"}</Link></p>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {t("hasAccount")}{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              {t("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
