import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  dot?: string;
}

/** Pastille de statut : teinte douce, lisible d'un coup d'œil. */
export function Badge({ children, className, dot }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}