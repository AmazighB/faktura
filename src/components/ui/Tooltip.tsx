import { type ReactNode, useState, useRef, useId } from 'react';
import { cn } from '@/utils/cn';

interface TooltipProps {
  children: ReactNode;
  label: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const sideClasses: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

export function Tooltip({ children, label, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), 400);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={visible ? id : undefined}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'pointer-events-none absolute z-[300] whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg dark:bg-gray-700',
            'animate-fade-in',
            sideClasses[side],
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
