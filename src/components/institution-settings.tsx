"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function InstitutionSettings() {
  const [institution, setInstitution] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/profile").then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Načtení profilu selhalo.");
      if (active) setInstitution(data.profile.institution || "");
    }).catch((reason) => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ institution }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Uložení profilu selhalo.");
      setInstitution(data.profile.institution || ""); setSaved(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Uložení profilu selhalo."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void save(event)} className="space-y-3 border-t pt-4" aria-label="Škola nebo instituce">
    <div className="grid gap-2"><Label htmlFor="profile-institution">Škola nebo instituce</Label><Input id="profile-institution" value={institution} maxLength={300} disabled={loading || busy} placeholder="Např. Střední umělecká škola" aria-describedby="institution-help" onChange={(event) => { setInstitution(event.target.value); setSaved(false); }} /><p id="institution-help" className="text-sm text-muted-foreground">Volitelný údaj o vašem působišti. Vymazáním pole jej odstraníte.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {saved && <p role="status" className="text-sm">Škola nebo instituce byla uložena.</p>}
    <Button type="submit" disabled={loading || busy || Boolean(error && loading)}>{busy ? "Ukládání…" : "Uložit instituci"}</Button>
  </form>;
}
