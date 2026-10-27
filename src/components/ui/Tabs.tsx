import { cn } from '@/utils/cn';

interface TabsProps {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Contrôle segmenté : un seul regard pour savoir où l'on est. */
export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn('inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-gray-100 p-0.5 scrollbar-thin dark:bg-gray-800/70', className)}>
      {tabs.map((tab) => {
        const on = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              on
                ? 'bg-white text-gray-900 shadow-card dark:bg-gray-950 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className="num text-xs text-gray-400">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}