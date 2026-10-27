import { createContext, useContext } from 'react';
import type { ConfirmOptions } from '@/components/feedback/ConfirmDialog';

export interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// Fichier volontairement sans composant : le contexte reste le même objet après un rechargement à chaud (HMR).
export const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}