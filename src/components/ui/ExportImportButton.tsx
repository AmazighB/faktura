import { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, FileJson, FileText, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { exportData, parseImportFile, readFileAsText, type ExportFormat, type ExportColumn, type ParsedImportRow } from '@/utils/exportImport';

interface ExportImportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  onImport?: (rows: ParsedImportRow[]) => void;
  importLabel?: string;
  className?: string;
}

export function ExportImportButton<T>({
  data,
  columns,
  filename,
  onImport,
  importLabel = 'Importer',
  className,
}: ExportImportButtonProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (format: ExportFormat) => {
    exportData(data, columns, filename, format);
    setMenuOpen(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const rows = parseImportFile(text, file.name);
      onImport?.(rows);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    }
    setMenuOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <Download className="h-4 w-4" />
        <span>Exporter</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-gray-400">Exporter</p>
            <button onClick={() => handleExport('csv')} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              <FileText className="h-4 w-4 text-gray-400" /> CSV
            </button>
            <button onClick={() => handleExport('json')} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              <FileJson className="h-4 w-4 text-gray-400" /> JSON
            </button>
            <button onClick={() => handleExport('xls')} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              <FileSpreadsheet className="h-4 w-4 text-gray-400" /> Excel (XLS)
            </button>
            {onImport && (
              <>
                <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-gray-400">{importLabel}</p>
                <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  <Upload className="h-4 w-4 text-gray-400" /> Importer (CSV/JSON)
                </button>
              </>
            )}
          </div>
          {onImport && (
            <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFileSelect} />
          )}
        </>
      )}
    </div>
  );
}
