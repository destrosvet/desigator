"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const t = useTranslations("navigation");
  const roles = useTranslations("roles");
  const { data: session } = useSession();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("settings")}</h1>
          <p className="text-muted-foreground mt-1">Nastavení účtu a aplikace</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Informace o vašem účtu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Jméno</Label>
              <p className="text-sm">{session?.user?.name}</p>
            </div>
            <Separator />
            <div className="grid gap-2">
              <Label>Email</Label>
              <p className="text-sm">{session?.user?.email}</p>
            </div>
            <Separator />
            <div className="grid gap-2">
              <Label>Role</Label>
              <p className="text-sm">{roles(session?.user?.role || "STUDENT")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
