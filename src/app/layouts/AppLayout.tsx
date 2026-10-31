import { useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { printElement } from '@/utils/print';
import { LockScreen } from '@/components/layout/LockScreen';
import { useAuth } from '@/app/providers/AuthContext';
import { useIdleLock } from '@/hooks/useIdleLock';
import { cn } from '@/utils/cn';

export function AppLayout() {
  const navigate = useNavigate();
  const go = useCallback((path: string) => navigate(path), [navigate]);
  const { pathname } = useLocation();
  const { user, locked, lock } = useAuth();

  // Verrouillage automatique après 10 minutes d'inactivité (délai : utils/security.ts)
  useIdleLock(!!user && !locked, () => lock('auto'));

  const shortcuts = useMemo(
    () => [
      { combo: 'g d', handler: () => go('/dashboard') },
      { combo: 'g c', handler: () => go('/clients') },
      { combo: 'g i', handler: () => go('/invoices') },
      { combo: 'g q', handler: () => go('/quotes') },
      { combo: 'g p', handler: () => go('/payments') },
      { combo: 'g e', handler: () => go('/expenses') },
      { combo: 'g r', handler: () => go('/reports') },
      { combo: 'g s', handler: () => go('/settings') },
      // Ctrl+N : nouveau document selon la section courante (jamais depuis un éditeur, pour ne pas perdre de saisie)
      {
        combo: 'ctrl+n',
        handler: () => {
          if (/\/(new|edit)(\/|$)/.test(pathname)) return;
          if (pathname.startsWith('/quotes')) go('/quotes/new');
          else if (pathname.startsWith('/clients')) go('/clients/new');
          else if (pathname.startsWith('/payments') || pathname.startsWith('/unpaid')) go('/payments/new');
          else go('/invoices/new');
        },
      },
      // Ctrl+F : place le curseur dans la recherche de la page (sinon, recherche native du navigateur)
      {
        combo: 'ctrl+f',
        preventDefault: false,
        handler: (e: KeyboardEvent) => {
          const input = document.querySelector<HTMLInputElement>('[data-global-search]');
          if (!input) return;
          e.preventDefault();
          input.focus();
          input.select();
        },
      },
      // Ctrl+P : impression du document affiché (sinon, impression native)
      {
        combo: 'ctrl+p',
        preventDefault: false,
        handler: (e: KeyboardEvent) => {
          if (!document.getElementById('document-preview')) return;
          e.preventDefault();
          printElement('document-preview', document.querySelector('h1')?.textContent ?? 'Document');
        },
      },
    ],
    [go, pathname],
  );
  // Session verrouillée : aucun raccourci clavier actif
  useKeyboardShortcuts(locked ? [] : shortcuts);

  return (
    <>
    <div className={cn(locked ? 'hidden' : 'flex', 'h-screen overflow-hidden bg-gray-50 dark:bg-gray-950')} aria-hidden={locked}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-md focus:bg-accent-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white">
        Aller au contenu
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main id="main-content" className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
    {locked && <LockScreen />}
    </>
  );
}