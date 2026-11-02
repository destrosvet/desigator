"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { sortTableRows, type TableSort, type SortValue } from "@/lib/table-sorting";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataFilters, type FilterConfig } from "@/components/data-filters";
import { ChevronLeft, ChevronRight, Search, MoreHorizontal, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Columns3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type TableColumn = { key: string; label: string; render?: (row: any) => React.ReactNode; sortValue?: (row: any) => SortValue };
type BulkAction = { label: string; onApply: (ids: string[]) => Promise<void> };
interface DataTableProps {
  data: any[];
  columns: TableColumn[];
  tableId: string;
  clientPagination?: boolean;
  sort?: TableSort;
  onSortChange?: (sort: TableSort) => void;
  total: number; page: number; limit: number;
  onSearch: (search: string) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  actions?: (row: any) => { label: string; onClick: () => void }[];
  onRowClick?: (row: any) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onFiltersChange?: (filters: Record<string, string>) => void;
  onDeleteRows?: (ids: string[]) => Promise<void>;
  membershipRemoval?: boolean;
  selectionVersion?: number;
  rowLabel?: (row: any) => string;
  bulkActions?: BulkAction[];
  selectionActions?: { label: string; onSelect: (ids: string[]) => void }[];
}

export function DataTable({ data: inputData, columns, tableId, clientPagination = false, sort: controlledSort, onSortChange, total, page, limit, onSearch, onPageChange, onLimitChange, actions, onRowClick, searchPlaceholder = "Vyhledat…", filters, onFiltersChange, onDeleteRows, membershipRemoval = false, selectionVersion = 0, rowLabel = (row) => row.name || row.title || row.id, bulkActions = [], selectionActions = [] }: DataTableProps) {
  const { data: session } = useSession();
  const storageKey = "desigator:columns:" + (session?.user?.id || "anonymous") + ":" + tableId;
  const [visibility, setVisibility] = useState<{ storageKey: string; hidden: string[] }>({ storageKey: "", hidden: [] });
  const [localSort, setLocalSort] = useState<TableSort>(null);
  const sort = onSortChange ? controlledSort ?? null : localSort;
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved) && saved.every((key) => typeof key === "string")) {
        queueMicrotask(() => setVisibility({ storageKey, hidden: saved }));
      }
    } catch { /* Column preferences are optional when browser storage is unavailable. */ }
  }, [storageKey]);
  const hidden = visibility.storageKey === storageKey ? visibility.hidden : [];
  const remaining = columns.filter((column) => !hidden.includes(column.key));
  const visibleColumns = remaining.length ? remaining : columns;
  const sorted = clientPagination ? sortTableRows(inputData, sort, (row, key) => { const column = columns.find((item) => item.key === key); return column?.sortValue ? column.sortValue(row) : row[key]; }) : inputData;
  const data = clientPagination ? sorted.slice((page - 1) * limit, page * limit) : sorted;
  function toggleColumn(key: string) {
    const next = hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key];
    setVisibility({ storageKey, hidden: next });
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep the current selection in memory. */ }
  }
  function changeSort(key: string) {
    const next: TableSort = sort?.key !== key ? { key, direction: "asc" } : sort.direction === "asc" ? { key, direction: "desc" } : null;
    choose([]); onPageChange(1);
    if (onSortChange) onSortChange(next); else setLocalSort(next);
  }
  const [searchValue, setSearchValue] = useState("");
  const [selection, setSelection] = useState<{ scope: string; ids: string[] }>({ scope: "", ids: [] });
  const [pending, setPending] = useState<{ ids: string[]; labels: string[]; action?: BulkAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selectable = Boolean(onDeleteRows || bulkActions.length || selectionActions.length);
  const scope = JSON.stringify([page, limit, data.map((row) => row.id), sort, selectionVersion]);
  const selected = selection.scope === scope ? selection.ids : [];
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const actionColumn = Boolean(actions || onDeleteRows);
  function choose(ids: string[]) { setSelection({ scope, ids }); setMessage(""); }
  function ask(ids: string[], action?: BulkAction) { setError(""); setPending({ ids, labels: data.filter((row) => ids.includes(row.id)).map(rowLabel), action }); }
  async function apply() {
    if (!pending || busy) return;
    setBusy(true); setError("");
    try {
      if (pending.action) await pending.action.onApply(pending.ids);
      else await onDeleteRows?.(pending.ids);
      setMessage(pending.action ? "Upraveno záznamů: " + pending.ids.length : (membershipRemoval ? "Odebráno členství: " : "Smazáno záznamů: ") + pending.ids.length);
      if (!pending.action) onPageChange(Math.max(1, Math.min(page, Math.ceil((total - pending.ids.length) / Math.max(1, limit)))));
      setSelection({ scope: "", ids: [] }); setPending(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Operace selhala."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><form onSubmit={(event) => { event.preventDefault(); choose([]); onSearch(searchValue); onPageChange(1); }} className="flex items-center gap-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={searchValue} onChange={(event) => setSearchValue(event.target.value)} className="pl-8" /></div><Button type="submit" variant="secondary" size="sm">Hledat</Button></form>{filters?.length && onFiltersChange ? <DataFilters filters={filters} onFiltersChange={(values) => { choose([]); onFiltersChange(values); onPageChange(1); }} /> : null}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Columns3 className="mr-2 size-4" />Sloupce</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Zobrazené sloupce</DropdownMenuLabel>{columns.map((column) => <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns.some((item) => item.key === column.key)} disabled={visibleColumns.length === 1 && visibleColumns[0].key === column.key} onSelect={(event) => event.preventDefault()} onCheckedChange={() => toggleColumn(column.key)}>{column.label}</DropdownMenuCheckboxItem>)}<DropdownMenuSeparator /><DropdownMenuItem onSelect={() => { setVisibility({ storageKey, hidden: [] }); try { localStorage.removeItem(storageKey); } catch {} }}>Zobrazit všechny</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    {selectable ? <div className="flex flex-wrap items-center gap-2 rounded border bg-muted/30 p-2"><span className="mr-auto text-sm">Vybráno {selected.length} · výběr z aktuální stránky</span>{selectionActions.map(action => <Button key={action.label} variant="outline" size="sm" disabled={!selected.length || busy} onClick={() => action.onSelect([...selected])}>{action.label}</Button>)}{bulkActions.map((action) => <Button key={action.label} variant="outline" size="sm" disabled={!selected.length || busy} onClick={() => ask([...selected], action)}>{action.label}</Button>)}{onDeleteRows ? <Button variant="destructive" size="sm" disabled={!selected.length || busy} onClick={() => ask([...selected])}><Trash2 className="mr-1.5 size-4" />{membershipRemoval ? "Odebrat ze třídy" : "Smazat vybrané"} ({selected.length})</Button> : null}{selected.length ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => choose([])}>Zrušit výběr</Button> : null}</div> : null}
    {message ? <p role="status" className="text-sm">{message}</p> : null}
    <div className="rounded-md border"><Table><TableHeader><TableRow>
      {selectable ? <TableHead className="w-10"><input type="checkbox" aria-label="Vybrat všechny řádky na stránce" checked={data.length > 0 && selected.length === data.length} disabled={!data.length || busy} ref={(node) => { if (node) node.indeterminate = selected.length > 0 && selected.length < data.length; }} onChange={(event) => choose(event.target.checked ? data.map((row) => row.id) : [])} /></TableHead> : null}
      {visibleColumns.map((column) => <TableHead key={column.key} aria-sort={sort?.key === column.key ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" className="inline-flex items-center gap-2 py-3 text-left hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary" onClick={() => changeSort(column.key)} aria-label={"Řadit podle: " + column.label}>{column.label}{sort?.key === column.key ? sort.direction === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" /> : <ArrowUpDown className="size-3.5 text-muted-foreground" />}</button></TableHead>)}{actionColumn ? <TableHead className="w-24 text-right">Akce</TableHead> : null}
    </TableRow></TableHeader><TableBody>
      {!data.length ? <TableRow><TableCell colSpan={visibleColumns.length + Number(selectable) + Number(actionColumn)} className="h-24 text-center text-muted-foreground">Žádné výsledky</TableCell></TableRow> : data.map((row) => <TableRow key={row.id} data-state={selected.includes(row.id) ? "selected" : undefined} tabIndex={onRowClick ? 0 : undefined} aria-label={onRowClick ? "Otevřít: " + rowLabel(row) : undefined} className={onRowClick ? "cursor-pointer hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary" : ""} onClick={(event) => { if (!(event.target instanceof Element) || !event.target.closest("button, input, a, select, textarea, [role=checkbox], [role=menuitem]")) onRowClick?.(row); }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRowClick?.(row); } }}>
        {selectable ? <TableCell onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={"Vybrat: " + rowLabel(row)} checked={selected.includes(row.id)} disabled={busy} onChange={(event) => choose(event.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} /></TableCell> : null}
        {visibleColumns.map((column) => <TableCell key={column.key}>{column.render ? column.render(row) : row[column.key]}</TableCell>)}
        {actionColumn ? <TableCell onClick={(event) => event.stopPropagation()}><div className="flex justify-end gap-1">{actions ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={"Další akce: " + rowLabel(row)}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions(row).map((action) => <DropdownMenuItem key={action.label} onClick={action.onClick}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu> : null}{onDeleteRows ? <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={(membershipRemoval ? "Odebrat ze třídy: " : "Smazat: ") + rowLabel(row)} disabled={busy} onClick={() => ask([row.id])}><Trash2 className="size-4" /></Button> : null}</div></TableCell> : null}
      </TableRow>)}
    </TableBody></Table></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><span>Zobrazeno {data.length} z {total}</span><Select value={String(limit || 20)} onValueChange={(value) => { choose([]); onLimitChange(Number(value)); onPageChange(1); }}><SelectTrigger className="h-8 w-20" aria-label="Počet řádků na stránce"><SelectValue /></SelectTrigger><SelectContent>{[10, 20, 50, 100].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select><span>na stránku</span></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" aria-label="Předchozí stránka" onClick={() => { choose([]); onPageChange(page - 1); }} disabled={page <= 1 || busy}><ChevronLeft className="size-4" /></Button><span className="text-sm">Strana {page} z {totalPages}</span><Button variant="outline" size="sm" aria-label="Další stránka" onClick={() => { choose([]); onPageChange(page + 1); }} disabled={page >= totalPages || busy}><ChevronRight className="size-4" /></Button></div></div>
    <AlertDialog open={Boolean(pending)} onOpenChange={(open) => { if (!open && !busy) { setPending(null); setError(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pending?.action ? "Potvrdit hromadnou úpravu" : membershipRemoval ? "Potvrdit odebrání ze třídy" : "Potvrdit smazání"}</AlertDialogTitle><AlertDialogDescription asChild><div className="space-y-2"><p>{pending?.action ? pending.action.label : membershipRemoval ? "Odebrat vybrané studenty z této třídy?" : "Opravdu smazat vybrané záznamy? Tuto akci nelze vrátit."} · {pending?.ids.length} záznamů</p><ul className="max-h-48 list-disc overflow-auto pl-5">{pending?.labels.map((label, index) => <li key={index}>{label}</li>)}</ul>{!pending?.action ? <p>{membershipRemoval ? "Účty, odevzdané práce, hodnocení a členství v ostatních třídách zůstanou zachované." : "Záznamy s navázanými pracemi nelze smazat. Celý výběr se provede společně, nebo zůstane beze změny."}</p> : null}</div></AlertDialogDescription></AlertDialogHeader>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Zrušit</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void apply(); }}>{busy ? "Provádění…" : pending?.action ? "Potvrdit úpravu" : membershipRemoval ? "Potvrdit odebrání ze třídy" : "Potvrdit smazání"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
