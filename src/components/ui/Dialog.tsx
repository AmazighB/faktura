import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

export function Dialog({ open, onClose, title, children, className, size = 'md' }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useFocusTrap(containerRef, open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        ref={containerRef}
        className={cn(
          'relative z-10 w-full rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 animate-slide-up',
          sizes[size],
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}