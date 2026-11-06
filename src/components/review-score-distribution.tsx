export function ReviewScoreDistribution({ scores, maximum }: { scores: number[]; maximum: number }) {
  const step = Math.max(1, Math.ceil((maximum + 1) / 24));
  const bins = Array.from({ length: Math.ceil((maximum + 1) / step) }, () => 0);
  const frequencies = new Map<number, number>();
  for (const score of scores) {
    bins[Math.floor(score / step)]++;
    frequencies.set(score, (frequencies.get(score) ?? 0) + 1);
  }
  const peak = Math.max(1, ...bins);
  const barWidth = 276 / bins.length;

  return <section aria-label="Rozložení mých bodů" className="min-w-0 rounded-xl border bg-card px-4 py-3">
    <h2 className="text-sm font-semibold">Rozložení mých bodů</h2>
    <p className="mt-1 text-xs text-muted-foreground">Dokončená hodnocení za celé zadání · {scores.length}</p>
    {scores.length ? <>
      <svg role="img" aria-label="Histogram. Vodorovná osa ukazuje body, svislá počet hodnocení." viewBox="0 0 320 134" className="mt-2 w-full text-muted-foreground">
        <path d="M32 12V108H308" stroke="currentColor" fill="none" />
        <text x="28" y="17" textAnchor="end" fill="currentColor" fontSize="11">{peak}</text>
        <text x="28" y="108" textAnchor="end" fill="currentColor" fontSize="11">0</text>
        {bins.map((count, index) => {
          const first = index * step;
          const last = Math.min(maximum, first + step - 1);
          const label = first === last ? first : `${first}–${last}`;
          const height = count / peak * 96;
          return <rect key={first} x={33 + index * barWidth} y={108 - height} width={barWidth - 2} height={height} rx="1" className="fill-primary">
            <title>{label} b. · {count} hodnocení</title>
          </rect>;
        })}
        <text x="32" y="126" fill="currentColor" fontSize="11">0 b.</text>
        <text x="308" y="126" textAnchor="end" fill="currentColor" fontSize="11">{maximum} b.</text>
      </svg>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Přesné četnosti bodů</summary>
        <div className="mt-2 max-h-40 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <thead><tr><th scope="col">Body</th><th scope="col">Počet hodnocení</th></tr></thead>
            <tbody>{[...frequencies].sort(([a], [b]) => a - b).map(([points, count]) => <tr key={points}><td>{points}</td><td>{count}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </> : <p className="mt-3 text-sm text-muted-foreground">Graf se zobrazí po dokončení prvního hodnocení.</p>}
  </section>;
}
