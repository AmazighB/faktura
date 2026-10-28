import { useMemo, useState } from 'react';
import { Plus, Shield, Activity, KeyRound, Trash2, UserCog, Database, Lock, Users, HardDrive } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input, Select } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { useConfirm } from '@/app/providers/ConfirmContext';
import { formatRelative } from '@/utils/format';
import { userRoleLabels } from '@/utils/labels';
import { PERMISSION_MODULES, PERMISSION_ACTIONS, getRoleDefaultPermissions } from '@/utils/permissions';
import { cn } from '@/utils/cn';
import type { User, UserRole, ActivityLog, Permissions, PermissionModule, PermissionAction } from '@/types';

const sections = [
  { key: 'users', label: 'Utilisateurs', icon: Users },
  { key: 'logs', label: 'Activité', icon: Activity },
  { key: 'backups', label: 'Sauvegardes', icon: HardDrive },
] as const;

const emptyUser: Omit<User, 'id' | 'createdAt'> = { name: '', email: '', role: 'employe', active: true, permissions: {} };

export default function AdministrationPage() {
  const { push } = useToast();
  const confirm = useConfirm();
  const [section, setSection] = useState<string>('users');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<Omit<User, 'id' | 'createdAt'>>(emptyUser);
  const [saving, setSaving] = useState(false);

  const { data: users, loading, reload } = useAsync(() => services.users.list(), []);
  const { data: logs } = useAsync(() => services.activityLogs.list(), []);
  const { data: backups, reload: reloadBackups } = useAsync(() => services.backups.list(), []);

  const openNew = () => { setEditing(null); setForm({ ...emptyUser, permissions: getRoleDefaultPermissions('employe') }); setDialogOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ ...u, permissions: u.permissions ?? {} }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { push('error', 'Nom et email obligatoires'); return; }
    setSaving(true);
    try {
      const dataToSave = form.role === 'admin' ? { ...form, permissions: getRoleDefaultPermissions('admin') } : form;
      if (editing) { await services.users.update(editing.id, dataToSave); push('success', 'Utilisateur modifié'); }
      else { await services.users.create(dataToSave); push('success', 'Utilisateur créé'); }
      setDialogOpen(false); reload();
    } catch { push('error', 'Erreur'); } finally { setSaving(false); }
  };

  const handleResetPassword = async (u: User) => {
    const ok = await confirm({ title: 'Réinitialiser le mot de passe', message: `Réinitialiser le mot de passe de ${u.name} ?`, confirmLabel: 'Réinitialiser' });
    if (ok) push('success', 'Mot de passe réinitialisé', `Email envoyé à ${u.email}`);
  };

  const togglePermission = (module: PermissionModule, action: PermissionAction, value: boolean) => {
    setForm((f) => {
      const perms: Permissions = { ...(f.permissions ?? {}) };
      const modPerms = { ...(perms[module] ?? {}) };
      if (action === 'view' && !value) { perms[module] = {}; }
      else if (action === 'view' && value) { modPerms.view = true; perms[module] = modPerms; }
      else { modPerms[action] = value; if (value && !modPerms.view) modPerms.view = true; perms[module] = modPerms; }
      return { ...f, permissions: perms };
    });
  };

  const toggleModuleAll = (module: PermissionModule, value: boolean) => {
    setForm((f) => {
      const perms: Permissions = { ...(f.permissions ?? {}) };
      if (value) { const all: Partial<Record<PermissionAction, boolean>> = {}; for (const a of PERMISSION_ACTIONS) all[a.key] = true; perms[module] = all; }
      else { perms[module] = {}; }
      return { ...f, permissions: perms };
    });
  };

  const userColumns: Column<User>[] = [
    { key: 'name', header: 'Nom', sortable: true, sortValue: (u) => u.name, render: (u) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{u.name.charAt(0).toUpperCase()}</div>
        <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div>
      </div>
    )},
    { key: 'role', header: 'Rôle', render: (u) => <Badge className={u.role === 'admin' ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}>{userRoleLabels[u.role]}</Badge> },
    { key: 'active', header: 'Statut', render: (u) => u.active ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Actif</Badge> : <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800">Inactif</Badge> },
    { key: 'lastLogin', header: 'Connexion', render: (u) => <span className="text-xs text-gray-400">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Jamais'}</span> },
    { key: 'actions', header: '', align: 'right', render: (u) => (
      <div className="flex justify-end gap-1">
        <Tooltip label="Modifier"><button onClick={() => openEdit(u)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Modifier"><UserCog className="h-3.5 w-3.5" /></button></Tooltip>
        <Tooltip label="Mot de passe"><button onClick={() => handleResetPassword(u)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Mot de passe"><KeyRound className="h-3.5 w-3.5" /></button></Tooltip>
        <Tooltip label="Supprimer"><button onClick={async () => { const ok = await confirm({ title: 'Supprimer', message: `Supprimer ${u.name} ?`, confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) { await services.users.remove(u.id); push('success', 'Utilisateur supprimé'); reload(); } }} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" aria-label="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button></Tooltip>
      </div>
    )},
  ];

  const handleBackup = async () => { await services.backups.createManual(); push('success', 'Sauvegarde effectuée'); reloadBackups(); };
  const handleRestore = async (id: string) => { const ok = await confirm({ title: 'Restaurer', message: 'Restaurer cette sauvegarde ?', confirmLabel: 'Restaurer', variant: 'danger' }); if (ok) { await services.backups.restore(id); push('success', 'Sauvegarde restaurée'); } };

  const isAdmin = form.role === 'admin';
  const enabledModuleCount = useMemo(() => { if (!form.permissions) return 0; return Object.values(form.permissions).filter((m) => m && Object.values(m).some(Boolean)).length; }, [form.permissions]);
  const activeUserCount = (users ?? []).filter((u) => u.active).length;

  return (
    <div>
      <PageHeader title="Administration" description="Utilisateurs, rôles et système"
        actions={section === 'users' ? <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5" /> Ajouter</Button> : undefined}
      />
      <PageContent>
        <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
          {/* Section sidebar */}
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {sections.map((s) => {
              const Icon = s.icon;
              const count = s.key === 'users' ? users?.length : s.key === 'logs' ? logs?.length : s.key === 'backups' ? backups?.length : undefined;
              return (
                <button key={s.key} onClick={() => setSection(s.key)}
                  className={cn('flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                    section === s.key ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200')}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", section === s.key ? "text-accent-600 dark:text-accent-400" : "text-gray-400")} /> {s.label}
                  {count !== undefined && <span className="num ml-auto rounded-full bg-gray-200/70 px-1.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">{count}</span>}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="min-w-0">
            {section === 'users' && (
              <div className="space-y-4">
                {/* Quick stats row */}
                <Card className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800">
                  <div className="px-5 py-4"><p className="label-quiet">Utilisateurs</p><p className="num mt-1 text-2xl font-semibold">{users?.length ?? 0}</p></div>
                  <div className="px-5 py-4"><p className="label-quiet">Actifs</p><p className="num mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{activeUserCount}</p></div>
                  <div className="px-5 py-4"><p className="label-quiet">Inactifs</p><p className="num mt-1 text-2xl font-semibold text-gray-500">{(users?.length ?? 0) - activeUserCount}</p></div>
                </Card>
                <Card>
                  {loading ? <SkeletonRows /> : (users?.length ?? 0) === 0 ? <EmptyState icon={Shield} title="Aucun utilisateur" /> : <DataTable columns={userColumns} data={users ?? []} rowKey={(u) => u.id} />}
                </Card>
              </div>
            )}

            {section === 'logs' && (
              <Card>
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800"><h3 className="text-sm font-semibold">Journal d'activité</h3><p className="text-xs text-gray-400">Consultable, non modifiable</p></div>
                <div className="max-h-[calc(100vh-280px)] divide-y divide-gray-100 overflow-y-auto scrollbar-thin dark:divide-gray-800/50">
                  {(logs ?? []).map((log: ActivityLog) => (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{log.userName.charAt(0)}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">{log.userName}</span> {log.action} {log.details && <span className="font-medium">{log.details}</span>}</p><p className="text-xs text-gray-400">{formatRelative(log.timestamp)}</p></div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {section === 'backups' && (
              <Card>
                <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                  <div><p className="text-sm font-medium">Sauvegardes</p><p className="text-xs text-gray-400">Dernière: {backups && backups[0] ? new Date(backups[0].date).toLocaleString('fr-FR') : '—'}</p></div>
                  <Button size="sm" onClick={handleBackup}>Sauvegarder</Button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {(backups ?? []).map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3"><Database className="h-4 w-4 text-gray-400" /><div><p className="text-sm font-medium">{new Date(b.date).toLocaleString('fr-FR')}</p><p className="text-xs text-gray-400">{b.size} · {b.location}</p></div></div>
                      <div className="flex items-center gap-2">
                        <Badge className={b.type === 'manuel' ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}>{b.type}</Badge>
                        <Button variant="outline" size="sm" onClick={() => handleRestore(b.id)}>Restaurer</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </PageContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'} size="lg" footer={<><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSave} disabled={saving}>{saving ? '...' : 'Enregistrer'}</Button></>}>
        <div className="max-h-[80vh] overflow-y-auto p-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rôle"><Select value={form.role} onChange={(e) => { const role = e.target.value as UserRole; setForm({ ...form, role, permissions: getRoleDefaultPermissions(role) }); }}><option value="admin">Administrateur</option><option value="comptable">Comptable</option><option value="commercial">Commercial</option><option value="employe">Employé</option></Select></Field>
              <div className="flex items-end"><label className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-2.5 dark:border-gray-800 w-full"><span className="text-sm">Compte actif</span><Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} /></label></div>
            </div>
            {isAdmin ? (
              <div className="rounded-lg border border-accent-200 bg-accent-50/50 p-4 dark:border-accent-900/30 dark:bg-accent-900/10">
                <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-accent-600" /><p className="text-sm font-medium text-accent-700 dark:text-accent-400">Administrateur — Accès total</p></div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Les administrateurs ont automatiquement accès à tous les modules et actions.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800"><Lock className="h-4 w-4 text-gray-400" /><div className="flex-1"><p className="text-sm font-semibold">Droits d'accès</p><p className="text-xs text-gray-400">{enabledModuleCount} module(s) avec accès</p></div></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Module</th>
                      {PERMISSION_ACTIONS.map((a) => <th key={a.key} className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-gray-400">{a.label}</th>)}
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-gray-400">Tout</th>
                    </tr></thead>
                    <tbody>
                      {PERMISSION_MODULES.map((mod) => {
                        const modPerms = form.permissions?.[mod.key] ?? {};
                        const allEnabled = PERMISSION_ACTIONS.every((a) => modPerms[a.key]);
                        return (
                          <tr key={mod.key} className="border-b border-gray-100 dark:border-gray-800/50">
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{mod.label}</td>
                            {PERMISSION_ACTIONS.map((a) => <td key={a.key} className="px-3 py-2 text-center"><input type="checkbox" checked={modPerms[a.key] ?? false} onChange={(e) => togglePermission(mod.key, a.key, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500 dark:border-gray-600 dark:bg-gray-800" /></td>)}
                            <td className="px-3 py-2 text-center"><input type="checkbox" checked={allEnabled} onChange={(e) => toggleModuleAll(mod.key, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500 dark:border-gray-600 dark:bg-gray-800" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}