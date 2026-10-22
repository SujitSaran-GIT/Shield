// Prefix spreadsheet formulas and escape CSV delimiters in untrusted values.
export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const raw = value == null ? '' : String(value);
    return `"${(/^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw).replaceAll('"', '""')}"`;
  };
  const csv = [columns.map(escape).join(','), ...rows.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
