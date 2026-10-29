import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { useConfirm } from '@/app/providers/ConfirmContext';

/**
 * Protège contre la perte de saisie : confirmation avant de quitter la page (navigation interne)
 * et avertissement natif du navigateur (fermeture / rechargement).
 * Renvoie `bypass` : à passer à `true` pendant un enregistrement qui redirige ensuite la page.
 */
export function useUnsavedChanges(dirty: boolean) {
  const confirm = useConfirm();
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const bypass = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypass.current && dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    void confirm({
      title: 'Quitter sans enregistrer ?',
      message: 'Vos modifications n\'ont pas été enregistrées et seront perdues.',
      confirmLabel: 'Quitter',
      variant: 'danger',
    }).then((leave) => {
      const b = blockerRef.current;
      if (b.state !== 'blocked') return;
      if (leave) b.proceed();
      else b.reset();
    });
  }, [blocker.state, confirm]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return { bypass };
}