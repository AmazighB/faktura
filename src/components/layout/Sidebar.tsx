import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, FileText, Receipt, CreditCard, Wallet, Truck, BarChart3,
  Settings, Shield, PanelLeftClose, PanelLeft, X, FileMinus, HandCoins,
} from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  moduleKey: string;
  hint?: string; // raccourci "g + lettre"
}

const mainNav: NavItem[] = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, moduleKey: 'dashboard', hint: 'D' },
  { to: '/clients', label: 'Clients', icon: Users, moduleKey: 'clients', hint: 'C' },
  { to: '/products', label: 'Produits & Services', icon: Package, moduleKey: 'products' },
];

const salesNav: NavItem[] = [
  { to: '/quotes', label: 'Devis', icon: FileText, moduleKey: 'quotes', hint: 'Q' },
  { to: '/invoices', label: 'Factures', icon: Receipt, moduleKey: 'invoices', hint: 'I' },
  { to: '/credit-notes', label: 'Avoirs', icon: FileMinus, moduleKey: 'creditNotes' },
];

const financeNav: NavItem[] = [
  { to: '/unpaid', label: 'À encaisser', icon: HandCoins, moduleKey: 'payments' },
  { to: '/payments', label: 'Paiements', icon: CreditCard, moduleKey: 'payments', hint: 'P' },
  { to: '/expenses', label: 'Dépenses', icon: Wallet, moduleKey: 'expenses', hint: 'E' },
  { to: '/suppliers', label: 'Fournisseurs', icon: Truck, moduleKey: 'suppliers' },
];

const systemNav: NavItem[] = [
  { to: '/reports', label: 'Rapports', icon: BarChart3, moduleKey: 'reports', hint: 'R' },
  { to: '/settings', label: 'Paramètres', icon: Settings, moduleKey: '__always', hint: 'S' },
  { to: '/administration', label: 'Administration', icon: Shield, moduleKey: '__always' },
];

function NavSection({ title, items, collapsed, moduleConfig }: { title?: string; items: NavItem[]; collapsed: boolean; moduleConfig: Record<string, boolean> }) {
  const visible = items.filter((item) => item.moduleKey === '__always' || moduleConfig[item.moduleKey]);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {title && !collapsed && <p className="px-3 pb-1 pt-5 text-xs font-medium text-gray-400 dark:text-gray-500">{title}</p>}
      {collapsed && title && <div className="mx-3 my-3 border-t border-gray-200 dark:border-gray-800" />}
      {visible.map((item) => {
        const link = (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
                  : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-100',
                collapsed && 'justify-center px-2',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute -left-2 top-2 h-5 w-[3px] rounded-full bg-accent-600" />}
                <item.icon className={cn('shrink-0', isActive ? 'text-accent-600 dark:text-accent-400' : 'text-gray-400 group-hover:text-gray-600')} style={{ width: 18, height: 18 }} strokeWidth={1.9} />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.hint && <span className="kbd opacity-0 transition-opacity group-hover:opacity-100">{item.hint}</span>}
              </>
            )}
          </NavLink>
        );
        return collapsed ? <Tooltip key={item.to} label={item.label} side="right">{link}</Tooltip> : link;
      })}
    </div>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen, moduleConfig } = useApp();
  const { user } = useAuth();
  const name = (user as { name?: string } | null)?.name ?? 'Mon compte';

  return (
    <>
      {mobileSidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 animate-fade-in lg:hidden" onClick={() => setMobileSidebarOpen(false)} />}

      <aside
        className={cn(
          'flex h-full flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950',
          sidebarCollapsed ? 'w-[68px]' : 'w-[248px]',
          'fixed inset-y-0 left-0 z-50 transition-[transform,width] duration-200 lg:static lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button onClick={() => setMobileSidebarOpen(false)} className="absolute right-2 top-3 rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden" aria-label="Fermer le menu">
          <X className="h-4 w-4" />
        </button>

        <div className={cn('flex items-center gap-2.5 px-4 pb-2 pt-5', sidebarCollapsed && 'justify-center px-2')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900">
            <Receipt className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          {!sidebarCollapsed && <p className="text-[15px] font-semibold tracking-tight">Factura</p>}
        </div>

        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
          <NavSection items={mainNav} collapsed={sidebarCollapsed} moduleConfig={moduleConfig} />
          <NavSection title="Ventes" items={salesNav} collapsed={sidebarCollapsed} moduleConfig={moduleConfig} />
          <NavSection title="Argent" items={financeNav} collapsed={sidebarCollapsed} moduleConfig={moduleConfig} />
          <NavSection title="Pilotage" items={systemNav} collapsed={sidebarCollapsed} moduleConfig={moduleConfig} />
        </nav>

        <div className={cn('flex items-center gap-2 border-t border-gray-200 p-3 dark:border-gray-800', sidebarCollapsed && 'flex-col')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
            {name.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && <p className="min-w-0 flex-1 truncate text-[13px] font-medium">{name}</p>}
          <Tooltip label={sidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'} side="right">
            <button onClick={toggleSidebar} aria-label={sidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'} className="hidden rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 lg:block">
              {sidebarCollapsed ? <PanelLeft style={{ width: 18, height: 18 }} /> : <PanelLeftClose style={{ width: 18, height: 18 }} />}
            </button>
          </Tooltip>
        </div>
      </aside>
    </>
  );
}