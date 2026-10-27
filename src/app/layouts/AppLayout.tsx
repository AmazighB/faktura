import { useCallback, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function AppLayout() {
  const navigate = useNavigate();
  const go = useCallback((path: string) => navigate(path), [navigate]);

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
    ],
    [go],
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
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
  );
}