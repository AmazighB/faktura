import { type ReactNode, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'right' | 'center';
  title?: (row: T) => string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  loading?: boolean;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  empty,
  selectable,
  selectedKeys = [],
  onSelectionChange,
  loading,
  defaultSort,
  pageSize = 50,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(defaultSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return data;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [data, sort, columns]);

  const paged = useMemo(() => sorted.slice(page * pageSize, (page + 1) * pageSize), [sorted, page, pageSize]);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.dir === 'asc' ? { key, dir: 'desc' } : null;
      }
      return { key, dir: 'asc' };
    });
  };

  const allSelected = paged.length > 0 && paged.every((r) => selectedKeys.includes(rowKey(r)));
  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedKeys.filter((k) => !paged.some((r) => rowKey(r) === k)));
    } else {
      onSelectionChange([...new Set([...selectedKeys, ...paged.map(rowKey)])]);
    }
  };

  const toggleRow = (key: string) => {
    if (!onSelectionChange) return;
    if (selectedKeys.includes(key)) {
      onSelectionChange(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedKeys, key]);
    }
  };

  const alignClass = (align?: string) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-accent-500" />
      </div>
    );
  }

  if (data.length === 0 && empty) {
    return <div>{empty}</div>;
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-900/60">
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-accent-600 focus:ring-accent-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap',
                    alignClass(col.align),
                    col.headerClassName,
                  )}
                >
                  {col.sortable ? (
                    <Tooltip
                      label={sort?.key === col.key ? `Tri ${sort.dir === 'asc' ? 'croissant' : 'décroissant'} — cliquer pour annuler` : `Trier par ${col.header.toLowerCase()}`}
                      side="top"
                    >
                      <button
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        {col.header}
                        {sort?.key === col.key ? (
                          sort.dir === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </Tooltip>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => {
              const key = rowKey(row);
              const selected = selectedKeys.includes(key);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'group border-b border-gray-100 transition-colors last:border-b-0 dark:border-gray-800/60',
                    onRowClick && 'cursor-pointer',
                    selected ? 'bg-accent-50/60 dark:bg-accent-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(key)}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-accent-600 focus:ring-accent-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      title={col.title ? col.title(row) : undefined}
                      className={cn('px-4 py-3 text-gray-700 dark:text-gray-300', alignClass(col.align), col.align === 'right' && 'num',
                        // Actions de ligne : discrètes au repos, visibles au survol / focus clavier (toujours visibles sur tactile)
                        col.key === 'actions' && '[&>*]:transition-opacity lg:[&>*]:opacity-0 lg:group-hover:[&>*]:opacity-100 lg:group-focus-within:[&>*]:opacity-100',
                        col.className)}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5 dark:border-gray-800">
          <p className="text-xs text-gray-500">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} sur {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Précédent
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              if (totalPages > 7 && Math.abs(i - page) > 2 && i !== 0 && i !== totalPages - 1) {
                if (i === 1 || i === totalPages - 2) {
                  return <span key={i} className="px-1 text-xs text-gray-400">…</span>;
                }
                return null;
              }
              return (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={cn(
                    'num h-7 w-7 rounded-md text-xs font-medium transition-colors',
                    page === i
                      ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}