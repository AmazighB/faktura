import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ConfirmOptions } from '@/components/feedback/ConfirmDialog';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { ConfirmContext } from './ConfirmContext';


export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setDialog({ ...options, resolve });
    }), []);
  const value = useMemo(() => ({ confirm }), [confirm]);

  const handleClose = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog && (
        <ConfirmDialog
          open
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          variant={dialog.variant}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}