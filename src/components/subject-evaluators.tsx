"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Evaluator = { id: string; name: string; email: string; institution: string | null; organization: { name: string } | null; standalone?: boolean };
export type SubjectEvaluator = Evaluator;
type Results = { assigned: Evaluator[]; available: Evaluator[]; hasMore: boolean };
function details(person: Evaluator) {
  return [person.email, person.organization?.name, person.institution].filter((value, index, all) => value && all.indexOf(value) === index).join(" · ");
}
export function SubjectEvaluators({ subjectId, initialAssigned }: { subjectId: string; initialAssigned: Evaluator[] }) {
  const [tableSearch, setTableSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const query = search.trim();
  const [data, setData] = useState<Results & { query: string }>({ assigned: initialAssigned, available: [], hasMore: false, query: "" });
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Evaluator | null>(null);
  const [deleteReviews, setDeleteReviews] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<{ query: string; text: string }>();
  const load = useCallback(async (query: string, signal?: AbortSignal) => {
    const response = await fetch(`/api/subjects/${subjectId}/evaluators?${new URLSearchParams({ search: query })}`, { signal });
    if (!response.ok) throw new Error("Hodnotitele se nepodařilo načíst.");
    return { ...await response.json() as Results, query };
  }, [subjectId]);
  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void load(query, controller.signal).then(result => { if (!controller.signal.aborted) { setData(result); setError(undefined); } }).catch(reason => { if (!controller.signal.aborted) setError({ query, text: reason.message }); });
    }, query.length >= 2 ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [load, query]);
  async function assign(evaluatorId: string, remove = false) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/subjects/${subjectId}/evaluators`, { method: remove ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(remove ? { evaluatorId, deleteReviews } : { evaluatorId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Přiřazení selhalo.");
      setData(await load(query));
      setRemoving(null);
      setMessage(remove ? deleteReviews ? "Hodnotitel a všechna jeho hodnocení byla z předmětu odebrána." : "Přiřazení a nevyplněná hodnocení byla odebrána. Rozpracovaná a dokončená hodnocení zůstala zachována." : "Hodnotitel byl přiřazen k předmětu.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Přiřazení selhalo."); }
    finally { setBusy(false); }
  }
  const current = data?.query === query;
  const searchError = error?.query === query ? error.text : undefined;
  const assigned = data.assigned.filter(person => [person.name, details(person)].join(" ").toLocaleLowerCase().includes(tableSearch.toLocaleLowerCase()));
  return <Card><CardHeader><CardTitle>Hodnotitelé předmětu</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Přiřazený hodnotitel najde v sekci Hodnocení finální práce ze všech zveřejněných a uzavřených zadání tohoto předmětu a počet zbývajících hodnocení. Automaticky se zahrnou i nové práce. Předmět nemůže upravovat.</p>
    {data.assigned.some(person => person.standalone) && <p className="text-sm text-muted-foreground">Samostatná hodnocení jsou vedená u jednotlivých prací.</p>}
    <section aria-label="Přiřazení hodnotitelé"><DataTable tableId="subject-evaluators" clientPagination data={assigned} columns={[
      { key: "name", label: "Jméno", render: (person: Evaluator) => <>{person.name}{person.standalone && <span className="block text-xs text-muted-foreground">Samostatná hodnocení</span>}</> },
      { key: "email", label: "E-mail" },
      { key: "organization", label: "Organizace", render: (person: Evaluator) => person.organization?.name || "—", sortValue: (person: Evaluator) => person.organization?.name || "" },
      { key: "institution", label: "Instituce", render: (person: Evaluator) => person.institution || "—" },
      { key: "actions", label: "Akce", render: (person: Evaluator) => <Button variant="outline" size="sm" disabled={busy} aria-label={`Odebrat ${person.name} z hodnocení předmětu`} onClick={() => { setMessage(""); setDeleteReviews(false); setRemoving(person); }}>Odebrat z hodnocení</Button> },
    ]} total={assigned.length} page={page} limit={limit} onSearch={setTableSearch} onPageChange={setPage} onLimitChange={setLimit} searchPlaceholder="Hledat přiřazené hodnotitele" /></section>
    <div className="space-y-2"><Label htmlFor="subject-evaluator-search">Vyhledat hodnotitele</Label><Input id="subject-evaluator-search" type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={busy} maxLength={100} placeholder="Jméno, e-mail nebo organizace" aria-describedby="subject-evaluator-hint" /><p id="subject-evaluator-hint" className="text-sm text-muted-foreground">Zadejte alespoň 2 znaky jména, e-mailu, organizace nebo instituce.</p></div>
    <div aria-live="polite" aria-busy={query.length >= 2 && !current && !searchError}>
      {searchError ? <p role="alert">{searchError}</p> : query.length >= 2 ? !current ? <p>Hledání…</p> : <>
        {data.available.length ? <ul aria-label="Nalezení hodnotitelé" className="divide-y rounded-md border">{data.available.map(person => <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 p-3"><div className="min-w-0 break-words"><strong>{person.name}</strong><p className="text-sm text-muted-foreground">{details(person)}</p></div><Button disabled={busy} aria-label={`Přiřadit ${person.name} k předmětu`} onClick={() => void assign(person.id)}>Přiřadit k předmětu</Button></li>)}</ul> : <p>Žádní další hodnotitelé neodpovídají hledání.</p>}
        {data.hasMore ? <p className="mt-2 text-sm text-muted-foreground">Zobrazeno prvních 20 výsledků. Zpřesněte hledání.</p> : null}
      </> : null}
    </div>
    <Dialog open={Boolean(removing)} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Odebrat hodnotitele z předmětu</DialogTitle>
          <DialogDescription>{removing?.name} · Výchozí odebrání zachová rozpracovaná, dokončená i zveřejněná hodnocení.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          <label className="flex items-start gap-2 font-medium"><input className="mt-1" type="checkbox" checked={deleteReviews} disabled={busy} onChange={event => setDeleteReviews(event.target.checked)} />Smazat také všechna hodnocení tohoto hodnotitele v předmětu</label>
          <p>Smažou se i uložené body a komentáře včetně zveřejněných. Výsledky se přepočítají. Smazání nelze vrátit.</p>
        </div>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => setRemoving(null)}>Zrušit</Button>
          <Button variant={deleteReviews ? "destructive" : "default"} disabled={busy} onClick={() => removing && void assign(removing.id, true)}>{deleteReviews ? "Odebrat a smazat hodnocení" : "Potvrdit odebrání"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {message && !removing ? <p role="status">{message}</p> : null}
  </CardContent></Card>;
}
