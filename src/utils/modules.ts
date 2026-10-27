// Module system: feature toggles stored in localStorage

import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  FileMinus,
  CreditCard,
  Wallet,
  Truck,
  BarChart3,
} from 'lucide-react';

export interface ModuleDef {
  key: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  group: 'core' | 'sales' | 'finance' | 'system';
  defaultEnabled: boolean;
}

export const ALL_MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Tableau de bord', description: 'Vue d\'ensemble de votre activité avec statistiques et graphiques', icon: LayoutDashboard, group: 'core', defaultEnabled: true },
  { key: 'clients', label: 'Clients', description: 'Gérez votre base de clients et leurs informations', icon: Users, group: 'core', defaultEnabled: true },
  { key: 'products', label: 'Produits & Services', description: 'Catalogue de produits et services avec catégories et stock', icon: Package, group: 'core', defaultEnabled: true },
  { key: 'quotes', label: 'Devis', description: 'Créez et suivez vos devis commerciaux', icon: FileText, group: 'sales', defaultEnabled: true },
  { key: 'invoices', label: 'Factures', description: 'Émettez des factures et suivez leur paiement', icon: Receipt, group: 'sales', defaultEnabled: true },
  { key: 'creditNotes', label: 'Avoirs', description: 'Gérez les avoirs et notes de crédit', icon: FileMinus, group: 'sales', defaultEnabled: false },
  { key: 'payments', label: 'Paiements', description: 'Enregistrez et suivez les paiements reçus', icon: CreditCard, group: 'finance', defaultEnabled: true },
  { key: 'expenses', label: 'Dépenses', description: 'Suivez vos dépenses par catégorie et fournisseur', icon: Wallet, group: 'finance', defaultEnabled: true },
  { key: 'suppliers', label: 'Fournisseurs', description: 'Gérez vos fournisseurs et achats', icon: Truck, group: 'finance', defaultEnabled: false },
  { key: 'reports', label: 'Rapports', description: 'Analyse financière détaillée avec export', icon: BarChart3, group: 'system', defaultEnabled: true },
];

const STORAGE_KEY = 'factura.modules';

export type ModuleConfig = Record<string, boolean>;

export function getDefaultModules(): ModuleConfig {
  const config: ModuleConfig = {};
  for (const m of ALL_MODULES) {
    config[m.key] = m.defaultEnabled;
  }
  return config;
}

export function loadModuleConfig(): ModuleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as ModuleConfig;
      const result = getDefaultModules();
      for (const m of ALL_MODULES) {
        if (m.key in stored) result[m.key] = stored[m.key];
      }
      return result;
    }
  } catch {
    // ignore
  }
  return getDefaultModules();
}

export function saveModuleConfig(config: ModuleConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem('factura.onboardingComplete') === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingComplete(value: boolean) {
  try {
    localStorage.setItem('factura.onboardingComplete', String(value));
  } catch {
    // ignore
  }
}

export function isModuleEnabled(key: string, config: ModuleConfig): boolean {
  return config[key] ?? false;
}
