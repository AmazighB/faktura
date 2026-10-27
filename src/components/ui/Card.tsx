import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('surface', className)}>{children}</div>;
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between gap-3 px-5 pt-4', className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-semibold text-gray-900 dark:text-gray-100', className)}>{children}</h3>;
}