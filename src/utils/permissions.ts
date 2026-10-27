import type { PermissionModule, PermissionAction, Permissions, UserRole } from '@/types';

export const PERMISSION_MODULES: { key: PermissionModule; label: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'clients', label: 'Clients' },
  { key: 'products', label: 'Produits' },
  { key: 'quotes', label: 'Devis' },
  { key: 'invoices', label: 'Factures' },
  { key: 'creditNotes', label: 'Avoirs' },
  { key: 'payments', label: 'Paiements' },
  { key: 'expenses', label: 'Dépenses' },
  { key: 'suppliers', label: 'Fournisseurs' },
  { key: 'reports', label: 'Rapports' },
  { key: 'settings', label: 'Paramètres' },
  { key: 'administration', label: 'Administration' },
];

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'view', label: 'Voir' },
  { key: 'create', label: 'Créer' },
  { key: 'edit', label: 'Modifier' },
  { key: 'delete', label: 'Supprimer' },
];

export function getRoleDefaultPermissions(role: UserRole): Permissions {
  if (role === 'admin') {
    const all: Permissions = {};
    for (const m of PERMISSION_MODULES) {
      const actions: Partial<Record<PermissionAction, boolean>> = {};
      for (const a of PERMISSION_ACTIONS) actions[a.key] = true;
      all[m.key] = actions;
    }
    return all;
  }
  return {};
}

export function hasPermission(
  permissions: Permissions | undefined,
  module: PermissionModule,
  action: PermissionAction,
  role: UserRole,
): boolean {
  if (role === 'admin') return true;
  return permissions?.[module]?.[action] ?? false;
}
