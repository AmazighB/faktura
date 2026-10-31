import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Monitor, Plus, FileText, Receipt, UserPlus, CreditCard, Menu, User, LogOut, ChevronDown, Zap, Package, Wallet, FileMinus, Maximize2, Shrink, Lock, Expand } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { useApp } from '@/app/providers/AppContext';
import { useAuth } from '@/app/providers/AuthContext';
import { services } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { formatRelative } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Notification } from '@/types';
import { userRoleLabels } from '@/utils/labels';

interface QuickAction {
  label: string;
  description: string;
  route: string;
  icon: typeof Zap;
  moduleKey: string;
}

const quickActions: QuickAction[] = [
  { label: 'Nouvelle facture', description: 'Créer une facture', route: '/invoices/new', icon: Receipt, moduleKey: 'invoices' },
  { label: 'Nouveau devis', description: 'Créer un devis', route: '/quotes/new', icon: FileText, moduleKey: 'quotes' },
  { label: 'Nouveau client', description: 'Ajouter un client', route: '/clients/new', icon: UserPlus, moduleKey: 'clients' },
  { label: 'Nouvel avoir', description: 'Créer un avoir', route: '/credit-notes/new', icon: FileMinus, moduleKey: 'creditNotes' },
  { label: 'Enregistrer un paiement', description: 'Nouveau paiement', route: '/payments/new', icon: CreditCard, moduleKey: 'payments' },
  { label: 'Nouvelle dépense', description: 'Enregistrer une dépense', route: '/expenses', icon: Wallet, moduleKey: 'expenses' },
  { label: 'Nouveau produit', description: 'Ajouter un produit ou service', route: '/products', icon: Package, moduleKey: 'products' },
];

export function Header() {
  const { theme, setTheme, toggleMobileSidebar, moduleConfig } = useApp();
  const { lock, logout, user } = useAuth();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  const { data: notifications, reload: reloadNotifs } = useAsync(() => services.notifications.list(), []);
  const { data: clients } = useAsync(() => services.clients.list(), []);
  const { data: invoices } = useAsync(() => services.invoices.list(), []);
  const { data: quotes } = useAsync(() => services.quotes.list(), []);
  const { data: products } = useAsync(() => services.products.list(), []);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const paletteResults = [
    {
      group: 'Clients',
      items: (clients ?? []).slice(0, 5).map((c) => ({
        id: c.id, label: c.name, subtitle: c.phone, route: `/clients/${c.id}`, icon: UserPlus,
      })),
    },
    {
      group: 'Factures',
      items: (invoices ?? []).slice(0, 5).map((i) => ({
        id: i.id, label: i.number, subtitle: i.date, route: `/invoices/${i.id}`, icon: Receipt,
      })),
    },
    {
      group: 'Devis',
      items: (quotes ?? []).slice(0, 5).map((q) => ({
        id: q.id, label: q.number, subtitle: q.date, route: `/quotes/${q.id}`, icon: FileText,
      })),
    },
    {
      group: 'Produits',
      items: (products ?? []).slice(0, 5).map((p) => ({
        id: p.id, label: p.name, subtitle: p.reference, route: '/products', icon: Search,
      })),
    },
  ];

  const paletteActions = [
    { label: 'Créer une facture', route: '/invoices/new', icon: Plus },
    { label: 'Créer un devis', route: '/quotes/new', icon: FileText },
    { label: 'Ajouter un client', route: '/clients/new', icon: UserPlus },
    { label: 'Enregistrer un paiement', route: '/payments/new', icon: CreditCard },
  ];

  const themeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  const handleNotifClick = (n: Notification) => {
    services.notifications.markRead(n.id);
    setNotifOpen(false);
    reloadNotifs();
    if (n.actionRoute) navigate(n.actionRoute);
  };

  return (
    <>
      <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
        <Tooltip label="Menu" side="bottom" className="lg:hidden">
          <button
            onClick={toggleMobileSidebar}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Basculer le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </Tooltip>

        <button
          onClick={() => setPaletteOpen(true)}
          className="flex flex-1 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-300 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-gray-700 max-w-md"
        >
          <Search className="h-4 w-4" />
          <span>Rechercher...</span>
          <kbd className="ml-auto rounded border border-gray-300 px-1.5 py-0.5 text-xs dark:border-gray-600">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setQuickOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Créer</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {quickOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setQuickOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                  <p className="px-4 py-2 text-xs font-medium text-gray-400">Créer</p>
                  {quickActions.filter((a) => moduleConfig[a.moduleKey] ?? a.moduleKey === '__always').map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.route}
                        onClick={() => { setQuickOpen(false); navigate(action.route); }}
                        className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.label}</p>
                          <p className="text-xs text-gray-400">{action.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <Tooltip label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'} side="bottom">
            <button
              onClick={toggleFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Shrink className="h-[18px] w-[18px]" /> : <Expand className="h-[18px] w-[18px]" />}
            </button>
          </Tooltip>
          <div className="relative">
            <Tooltip label="Changer le thème" side="bottom">
              <button
                onClick={() => setThemeMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Thème"
              >
                {(() => {
                  const Icon = themeIcon;
                  return <Icon className="h-[18px] w-[18px]" />;
                })()}
              </button>
            </Tooltip>
            {themeMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setThemeMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                  {[
                    { key: 'light' as const, label: 'Clair', icon: Sun },
                    { key: 'dark' as const, label: 'Sombre', icon: Moon },
                    { key: 'system' as const, label: 'Système', icon: Monitor },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setTheme(opt.key);
                          setThemeMenuOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-sm',
                          theme === opt.key
                            ? 'text-accent-600 dark:text-accent-400'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <Tooltip label={unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Notifications'} side="bottom">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </Tooltip>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          await services.notifications.markAllRead();
                          reloadNotifs();
                        }}
                        className="text-xs text-accent-600 hover:underline"
                      >
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {(notifications ?? []).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={cn(
                          'flex w-full flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/30',
                          !n.read && 'bg-accent-50/50 dark:bg-accent-900/10',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              n.type === 'warning' && 'bg-amber-400',
                              n.type === 'error' && 'bg-red-400',
                              n.type === 'success' && 'bg-emerald-400',
                              n.type === 'info' && 'bg-accent-400',
                            )}
                          />
                          <p className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-accent-500" />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{n.message}</p>
                        <p className="text-xs text-gray-400">{formatRelative(n.timestamp)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative ml-1">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                {(user?.name ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                <p className="text-xs text-gray-400">{user ? userRoleLabels[user.role] : ''}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-400 md:block" />
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-200 px-4 py-2.5 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <User className="h-4 w-4 text-gray-400" /> Mon profil
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); lock('manual'); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Lock className="h-4 w-4 text-gray-400" /> Verrouiller la session
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-800" />
                  <button
                    onClick={() => { setProfileOpen(false); logout(); navigate('/login'); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        onClose={() => {
          setPaletteOpen(false);
          setPaletteQuery('');
        }}
        query={paletteQuery}
        onQueryChange={setPaletteQuery}
        results={paletteResults}
        actions={paletteActions}
      />
    </>
  );
}