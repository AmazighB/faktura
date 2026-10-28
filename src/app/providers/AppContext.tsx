import { createContext, useContext } from 'react';
import type { Locale } from '@/utils/i18n';
import type { ModuleConfig } from '@/utils/modules';

export type Theme = 'light' | 'dark' | 'system';

export interface AppContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarLocked: boolean;
  setSidebarLocked: (locked: boolean) => void;
  toggleSidebarLocked: () => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  moduleConfig: ModuleConfig;
  setModuleConfig: (config: ModuleConfig) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}