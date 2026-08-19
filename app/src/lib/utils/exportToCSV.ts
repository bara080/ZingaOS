export function exportToCSV<T extends object>(data: T[], fileName: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0]) as (keyof T)[];

  const rows = data.map((row) =>
    headers.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(url);
}
