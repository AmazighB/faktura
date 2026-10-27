import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

const baseInput =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-card placeholder:text-gray-400 ' +
  'hover:border-gray-300 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:ring-offset-0 ' +
  'dark:border-gray-700 dark:hover:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 transition-colors';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseInput, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseInput, 'min-h-[80px] resize-y', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(baseInput, 'cursor-pointer appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}