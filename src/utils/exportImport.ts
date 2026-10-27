// Generic import/export utilities for CSV, JSON, and XLS (HTML table-based)

export type ExportFormat = 'csv' | 'json' | 'xls';

export interface ExportColumn<T> {
  key: string;
  label: string;
  getValue: (row: T) => string | number | boolean | undefined | null;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string | number | boolean | undefined | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV<T>(data: T[], columns: ExportColumn<T>[], filename: string) {
  const header = columns.map((c) => escapeCSV(c.label)).join(',');
  const rows = data.map((row) =>
    columns.map((c) => escapeCSV(c.getValue(row))).join(','),
  );
  const csv = '\uFEFF' + [header, ...rows].join('\r\n');
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

export function exportToJSON<T>(data: T[], filename: string) {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json');
}

export function exportToXLS<T>(data: T[], columns: ExportColumn<T>[], filename: string) {
  const headerRow = columns.map((c) => `<th>${c.label}</th>`).join('');
  const bodyRows = data
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => {
            const v = c.getValue(row);
            return `<td>${v ?? ''}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
  downloadFile(html, `${filename}.xls`, 'application/vnd.ms-excel');
}

export function exportData<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  format: ExportFormat,
) {
  if (format === 'json') {
    exportToJSON(data, filename);
  } else if (format === 'csv') {
    exportToCSV(data, columns, filename);
  } else {
    exportToXLS(data, columns, filename);
  }
}

// ── Import ──────────────────────────────────────────────

export interface ParsedImportRow {
  [key: string]: string;
}

function parseCSV(text: string): ParsedImportRow[] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect delimiter (comma or semicolon)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: ParsedImportRow = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseJSON(text: string): ParsedImportRow[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Le JSON doit être un tableau');
  return data as ParsedImportRow[];
}

export function parseImportFile(text: string, filename: string): ParsedImportRow[] {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'json') return parseJSON(text);
  if (ext === 'csv') return parseCSV(text);
  if (ext === 'xls' || ext === 'xlsx') throw new Error('Import XLS non supporté. Utilisez CSV ou JSON.');
  // Try to auto-detect
  try {
    return parseJSON(text);
  } catch {
    return parseCSV(text);
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

export function downloadTemplate(columns: ExportColumn<never>[], filename: string) {
  const header = columns.map((c) => escapeCSV(c.label)).join(',');
  const csv = '\uFEFF' + header + '\r\n';
  downloadFile(csv, `${filename}_modele.csv`, 'text/csv');
}
