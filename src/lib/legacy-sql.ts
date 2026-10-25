export type LegacyRow = Record<string, string | null>;
// Parse data values only. Never execute statements from the MySQL dump.
export function parseLegacySql(sql: string): Record<string, LegacyRow[]> {
  const tables: Record<string, LegacyRow[]> = {};
  const headers = /INSERT INTO `(dg_user|dg_course|dg_task|dg_course_task|dg_user_course|dg_mark)`\s*\(([^)]+)\)\s*VALUES\s*/g;
  let match: RegExpExecArray | null;
  while ((match = headers.exec(sql))) {
    const columns = match[2].split(',').map((s) => s.trim().replaceAll('`', ''));
    const rows = tables[match[1]] ||= [];
    let i = headers.lastIndex;
    while (i < sql.length) {
      while (/\s|,/.test(sql[i] || '') && i < sql.length) i++;
      if (sql[i] === ';') { i++; break; }
      if (sql[i++] !== '(') throw new Error('Invalid legacy SQL row');
      const values: (string | null)[] = [];
      while (i < sql.length) {
        while (/\s/.test(sql[i] || '') && i < sql.length) i++;
        let value = '';
        if (sql[i] === "'") {
          i++; let closed = false;
          while (i < sql.length) {
            const ch = sql[i++];
            if (ch === '\\') { const escaped = sql[i++]; value += ({ n: '\n', r: '\r', t: '\t', '0': '\0' } as Record<string, string>)[escaped] ?? escaped; }
            else if (ch === "'") { if (sql[i] === "'") { value += "'"; i++; } else { closed = true; break; } }
            else value += ch;
          }
          if (!closed) throw new Error('Unterminated SQL string');
          values.push(value);
        } else {
          while (i < sql.length && sql[i] !== ',' && sql[i] !== ')') value += sql[i++];
          value = value.trim();
          if (value !== 'NULL' && !/^-?\d+$/.test(value)) throw new Error('Unsupported SQL value');
          values.push(value === 'NULL' ? null : value);
        }
        while (/\s/.test(sql[i] || '') && i < sql.length) i++;
        if (sql[i] === ')') { i++; break; }
        if (sql[i++] !== ',') throw new Error('Invalid SQL delimiter');
      }
      if (values.length !== columns.length) throw new Error('Legacy column count mismatch');
      rows.push(Object.fromEntries(columns.map((c, j) => [c, values[j]])));
    }
    headers.lastIndex = i;
  }
  for (const table of ['dg_user', 'dg_course', 'dg_task', 'dg_course_task', 'dg_mark']) if (!tables[table]?.length) throw new Error('Missing legacy table: ' + table);
  return tables;
}
