import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher...', className, autoFocus }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-900 shadow-card placeholder:text-gray-400 hover:border-gray-300 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:ring-offset-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Effacer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}