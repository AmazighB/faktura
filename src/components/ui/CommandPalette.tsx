import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Receipt, Users, Package, CreditCard, Plus, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SearchResult {
  id: string;
  label: string;
  subtitle?: string;
  route: string;
  icon: typeof Search;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  results: { group: string; items: SearchResult[] }[];
  actions: { label: string; route: string; icon: typeof Plus }[];
}

export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  results,
  actions,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIdx(0);
    }
  }, [open]);

  const allItems = [
    ...results.flatMap((r) => r.items.map((i) => ({ ...i, group: r.group }))),
    ...actions.map((a) => ({ id: a.label, label: a.label, route: a.route, icon: a.icon, group: 'Actions' })),
  ];

  const filtered = query
    ? allItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  const handleSelect = (item: { route: string }) => {
    navigate(item.route);
    onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIdx]) {
        e.preventDefault();
        handleSelect(filtered[selectedIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selectedIdx]);

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div className="fixed inset-0 z-[180] flex items-start justify-center p-4 pt-[15vh]">
      <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-pop dark:border-gray-800 dark:bg-gray-900 animate-slide-up">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setSelectedIdx(0);
            }}
            placeholder="Rechercher clients, factures, devis, produits..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
          />
          <kbd className="kbd">
            Esc
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-gray-400">Aucun résultat</p>
          )}
          {results.map((group) => {
            const groupItems = group.items.filter((i) =>
              query ? i.label.toLowerCase().includes(query.toLowerCase()) : true,
            );
            if (groupItems.length === 0) return null;
            return (
              <div key={group.group} className="mb-2">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-400">
                  {group.group}
                </p>
                {groupItems.map((item) => {
                  runningIdx++;
                  const idx = runningIdx;
                  const isSelected = idx === selectedIdx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        isSelected ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300' : 'text-gray-700 dark:text-gray-300',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{item.label}</p>
                        {item.subtitle && <p className="truncate text-xs text-gray-400">{item.subtitle}</p>}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                    </button>
                  );
                })}
              </div>
            );
          })}
          {actions.length > 0 && (
            <div className="mb-2">
              <p className="px-3 py-1.5 text-xs font-medium text-gray-400">Actions</p>
              {actions.map((action) => {
                runningIdx++;
                const idx = runningIdx;
                const isSelected = idx === selectedIdx;
                return (
                  <button
                    key={action.label}
                    onClick={() => {
                      navigate(action.route);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      isSelected ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300' : 'text-gray-700 dark:text-gray-300',
                    )}
                  >
                    <action.icon className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="flex-1">{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}