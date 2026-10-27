import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Traps keyboard focus inside a container while it's open:
 * - Moves focus into the container on mount.
 * - Restores focus to the previously-focused element on unmount.
 * - Cycles Tab / Shift+Tab within the container.
 */
export function useFocusTrap<T extends HTMLElement>(ref: RefObject<T>, open: boolean): void {
  useEffect(() => {
    if (!open) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the container.
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const currentFocusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (currentFocusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handler);
    return () => {
      container.removeEventListener('keydown', handler);
      if (previouslyFocused) {
        previouslyFocused.focus();
      }
    };
  }, [ref, open]);
}
