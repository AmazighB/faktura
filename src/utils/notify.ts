export type NotifyType = 'success' | 'error' | 'info' | 'warning';

export const APP_TOAST_EVENT = 'app:toast';

/** Affiche une notification depuis du code hors composant React (utilitaires, impression, import…). */
export function notify(type: NotifyType, message: string, description?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APP_TOAST_EVENT, { detail: { type, message, description } }));
}