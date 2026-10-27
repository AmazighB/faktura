import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mx-auto flex w-full max-w-[1280px] flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pb-5 pt-7 sm:px-8', className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight text-gray-900 dark:text-gray-50">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-8', className)}>{children}</div>;
}