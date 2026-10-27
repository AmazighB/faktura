import { useEffect, useRef } from 'react';

interface ShortcutHandler {
  combo: string;
  handler: (e: KeyboardEvent) => void;
  preventDefault?: boolean;
}

function parseCombo(combo: string): { ctrl: boolean; meta: boolean; shift: boolean; keys: string[] } {
  const parts = combo.toLowerCase().split('+');
  const keysStr = parts[parts.length - 1];
  return {
    ctrl: parts.includes('ctrl') || parts.includes('cmd'),
    meta: parts.includes('cmd'),
    shift: parts.includes('shift'),
    keys: keysStr.split(' ').filter(Boolean),
  };
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  const sequenceRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;

      for (const shortcut of shortcuts) {
        const parsed = parseCombo(shortcut.combo);

        if (parsed.ctrl && !e.ctrlKey && !e.metaKey) continue;
        if (parsed.shift && !e.shiftKey) continue;

        if (parsed.keys.length > 1) {
          if (isInput) continue;
          const key = e.key.toLowerCase();
          if (!parsed.keys.includes(key)) continue;

          sequenceRef.current.push(key);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => { sequenceRef.current = []; }, 800);

          const seq = sequenceRef.current.join(' ');
          const target = parsed.keys.join(' ');
          if (seq === target) {
            sequenceRef.current = [];
            if (shortcut.preventDefault !== false) e.preventDefault();
            shortcut.handler(e);
          }
          return;
        }

        if (e.key.toLowerCase() !== parsed.keys[0]) continue;
        if (isInput && !parsed.ctrl && !parsed.meta) continue;

        if (shortcut.preventDefault !== false) e.preventDefault();
        shortcut.handler(e);
        break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
