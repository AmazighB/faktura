import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ToastContext, type Toast, type ToastType } from './ToastContext';
import { APP_TOAST_EVENT, type NotifyType } from '@/utils/notify';

export type { Toast, ToastType } from './ToastContext';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const styles: Record<ToastType, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-accent-600 dark:text-accent-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, description?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message, description }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  // Notifications émises hors composants (impression, import de fichiers…)
  useEffect(() => {
    const onNotify = (e: Event) => {
      const d = (e as CustomEvent<{ type: NotifyType; message: string; description?: string }>).detail;
      push(d.type, d.message, d.description);
    };
    window.addEventListener(APP_TOAST_EVENT, onNotify);
    return () => window.removeEventListener(APP_TOAST_EVENT, onNotify);
  }, [push]);

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-80 flex-col gap-2" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3.5 shadow-lg dark:border-gray-800 dark:bg-gray-900 animate-slide-up"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', styles[toast.type])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{toast.message}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}