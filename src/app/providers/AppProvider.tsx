import { useEffect, useState, type ReactNode } from 'react';
import type { Locale } from '@/utils/i18n';
import { t as translate } from '@/utils/i18n';
import { loadModuleConfig, type ModuleConfig } from '@/utils/modules';
import { AppContext, type AppContextValue, type Theme } from './AppContext';

export type { Theme } from './AppContext';

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && getSystemDark());
  document.documentElement.classList.toggle('dark', isDark);
}

function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function savePref(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => loadPref('factura.theme', 'system'));
  const [locale, setLocaleState] = useState<Locale>(() => loadPref('factura.locale', 'fr'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => loadPref('factura.sidebarCollapsed', false));
  const [sidebarLocked, setSidebarLockedState] = useState<boolean>(() => loadPref('factura.sidebarLocked', false));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [moduleConfig, setModuleConfigState] = useState<ModuleConfig>(() => loadModuleConfig());

  useEffect(() => {
    applyTheme(theme);
    savePref('factura.theme', theme);
  }, [theme]);

  useEffect(() => {
    savePref('factura.locale', locale);
  }, [locale]);

  useEffect(() => {
    savePref('factura.sidebarCollapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    savePref('factura.sidebarLocked', sidebarLocked);
  }, [sidebarLocked]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const value: AppContextValue = {
    theme,
    setTheme: setThemeState,
    locale,
    setLocale: setLocaleState,
    t: (key: string) => translate(key, locale),
    sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((v) => !v),
    sidebarLocked,
    setSidebarLocked: setSidebarLockedState,
    toggleSidebarLocked: () => setSidebarLockedState((v) => !v),
    mobileSidebarOpen,
    setMobileSidebarOpen,
    toggleMobileSidebar: () => setMobileSidebarOpen((v) => !v),
    moduleConfig,
    setModuleConfig: setModuleConfigState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}