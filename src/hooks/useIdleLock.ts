import { useEffect, useRef } from 'react';
import { AUTO_LOCK_MS, LAST_ACTIVITY_KEY, shouldAutoLock } from '@/utils/security';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Appelle `onIdle` après `timeoutMs` sans activité (souris, clavier, tactile, défilement).
 * La dernière activité est partagée entre les onglets et survit à un rechargement :
 * rouvrir l'application après une longue absence déclenche donc immédiatement le verrouillage.
 */
export function useIdleLock(enabled: boolean, onIdle: () => void, timeoutMs: number = AUTO_LOCK_MS): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    const read = (): number => {
      const raw = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
      return Number.isFinite(raw) && raw > 0 ? raw : Date.now();
    };
    const check = (): boolean => {
      if (!shouldAutoLock(read(), Date.now(), timeoutMs)) return false;
      onIdleRef.current();
      return true;
    };

    // Au montage : si l'absence dépasse déjà le délai, on verrouille avant de marquer une activité.
    if (check()) return;

    let lastWrite = 0;
    const mark = () => {
      const now = Date.now();
      if (now - lastWrite < 2000) return;
      lastWrite = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } catch {
        /* stockage indisponible : le verrouillage reste actif sur l'activité de cet onglet */
      }
    };
    mark();

    EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true, capture: true }));
    const timer = setInterval(check, 5000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, mark, { capture: true }));
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, timeoutMs]);
}