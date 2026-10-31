/** Verrouillage automatique de la session après inactivité. */
export const AUTO_LOCK_MINUTES = 10;
export const AUTO_LOCK_MS = AUTO_LOCK_MINUTES * 60 * 1000;

/** Protection contre les essais répétés de mot de passe. */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_SECONDS = 60;

export const LAST_ACTIVITY_KEY = 'factura.lastActivity';
export const LOCKED_KEY = 'factura.locked';

/** Vrai si l'inactivité (en ms) atteint ou dépasse le délai. */
export function shouldAutoLock(lastActivity: number, now: number, timeoutMs: number = AUTO_LOCK_MS): boolean {
  return now - lastActivity >= timeoutMs;
}