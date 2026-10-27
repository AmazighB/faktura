import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
        <Icon className="h-5 w-5 text-gray-500" strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
        <span className="text-xl text-red-500">!</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{message ?? 'Une erreur est survenue'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}