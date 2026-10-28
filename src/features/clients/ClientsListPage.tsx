import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Trash2, Edit3, X, Users2 } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { ExportImportButton } from '@/components/ui/ExportImportButton';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { useConfirm } from '@/app/providers/ConfirmContext';
import { formatCurrency, formatRelative } from '@/utils/format';
import { computeTotals } from '@/utils/calc';
import { clientTypeLabels } from '@/utils/labels';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';
import type { Client, ClientGroup } from '@/types';

const colorPalette = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#ef4444'];

export default function ClientsListPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', color: colorPalette[0], description: '' });
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null);

  const { data: clients, loading, error, reload } = useAsync(() => services.clients.list({ search }), [search]);
  const { data: invoices } = useAsync(() => services.invoices.list(), []);
  const { data: settings, reload: reloadSettings } = useAsync(() => services.settings.get(), []);
  const groups = settings?.clientGroups ?? [];
  const currency = settings?.currency ?? 'DA';

  const clientStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number; paid: number }>();
    for (const inv of invoices ?? []) {
      const s = map.get(inv.clientId) ?? { count: 0, total: 0, paid: 0 };
      s.count++;
      s.total += computeTotals(inv.items).totalTTC;
      s.paid += inv.paidAmount;
      map.set(inv.clientId, s);
    }
    return map;
  }, [invoices]);

  const filtered = useMemo(() => {
    return (clients ?? []).filter((c) => {
      if (groupFilter !== 'all' && c.groupId !== groupFilter) return false;
      return true;
    });
  }, [clients, groupFilter]);

  const getGroupName = (id?: string) => groups.find((g) => g.id === id)?.name;
  const getGroupColor = (id?: string) => groups.find((g) => g.id === id)?.color;

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      push('error', 'Le nom du groupe est obligatoire');
      return;
    }
    try {
      const currentGroups = settings?.clientGroups ?? [];
      let updated: ClientGroup[];
      if (editingGroup) {
        updated = currentGroups.map((g) => (g.id === editingGroup.id ? { ...g, ...groupForm } : g));
      } else {
        updated = [...currentGroups, { id: `cg${Date.now()}`, ...groupForm }];
      }
      await services.settings.update({ ...settings!, clientGroups: updated });
      push('success', editingGroup ? 'Groupe modifié' : 'Groupe créé');
      setGroupDialogOpen(false);
      setGroupForm({ name: '', color: colorPalette[0], description: '' });
      setEditingGroup(null);
      reloadSettings();
    } catch {
      push('error', 'Erreur');
    }
  };

  const handleDeleteGroup = async (group: ClientGroup) => {
    const ok = await confirm({ title: 'Supprimer le groupe', message: `Supprimer "${group.name}" ?`, confirmLabel: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    const updated = (settings?.clientGroups ?? []).filter((g) => g.id !== group.id);
    await services.settings.update({ ...settings!, clientGroups: updated });
    push('success', 'Groupe supprimé');
    reloadSettings();
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({ title: 'Supprimer', message: `Supprimer ${selectedKeys.length} client(s) ?`, confirmLabel: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    for (const id of selectedKeys) {
      await services.clients.remove(id);
    }
    push('success', `${selectedKeys.length} client(s) supprimé(s)`);
    setSelectedKeys([]);
    reload();
  };

  const handleBulkAssignGroup = async (groupId: string) => {
    for (const id of selectedKeys) {
      await services.clients.update(id, { groupId });
    }
    const groupName = getGroupName(groupId);
    push('success', `${selectedKeys.length} client(s) assigné(s) au groupe "${groupName}"`);
    setSelectedKeys([]);
    reload();
  };

  const handleImport = async (rows: { [key: string]: string }[]) => {
    let imported = 0;
    for (const row of rows) {
      try {
        const client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt'> = {
          name: row['Nom'] || row['name'] || '',
          type: (row['Type'] || row['type'] || 'particulier') as Client['type'],
          nif: row['NIF'] || row['nif'] || '',
          nis: row['NIS'] || row['nis'] || '',
          rc: row['RC'] || row['rc'] || '',
          ai: row['AI'] || row['ai'] || '',
          address: row['Adresse'] || row['address'] || '',
          wilaya: row['Wilaya'] || row['wilaya'] || '',
          commune: row['Commune'] || row['commune'] || '',
          phone: row['Téléphone'] || row['phone'] || '',
          email: row['Email'] || row['email'] || '',
        };
        if (client.name.trim()) {
          await services.clients.create(client);
          imported++;
        }
      } catch {
        // skip
      }
    }
    push('success', 'Import réussi', `${imported} client(s) importé(s)`);
    reload();
  };

  const exportColumns = [
    { key: 'name', label: 'Nom', getValue: (c: Client) => c.name },
    { key: 'type', label: 'Type', getValue: (c: Client) => clientTypeLabels[c.type] },
    { key: 'phone', label: 'Téléphone', getValue: (c: Client) => c.phone },
    { key: 'email', label: 'Email', getValue: (c: Client) => c.email },
    { key: 'address', label: 'Adresse', getValue: (c: Client) => c.address },
    { key: 'wilaya', label: 'Wilaya', getValue: (c: Client) => c.wilaya },
    { key: 'commune', label: 'Commune', getValue: (c: Client) => c.commune },
    { key: 'nif', label: 'NIF', getValue: (c: Client) => c.nif ?? '' },
    { key: 'nis', label: 'NIS', getValue: (c: Client) => c.nis ?? '' },
    { key: 'rc', label: 'RC', getValue: (c: Client) => c.rc ?? '' },
    { key: 'group', label: 'Groupe', getValue: (c: Client) => getGroupName(c.groupId) ?? '' },
  ];

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Nom',
      sortable: true,
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
              {c.groupId && (() => {
                const color = getGroupColor(c.groupId);
                const name = getGroupName(c.groupId);
                return name ? <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: color }}>{name}</span> : null;
              })()}
            </div>
            <p className="text-xs text-gray-400">{clientTypeLabels[c.type]}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Téléphone', render: (c) => <span className="text-gray-600">{c.phone || '—'}</span> },
    { key: 'email', header: 'Email', render: (c) => <span className="text-gray-600">{c.email || '—'}</span> },
    { key: 'wilaya', header: 'Wilaya', sortable: true, sortValue: (c) => c.wilaya, render: (c) => <span className="text-gray-600">{c.wilaya || '—'}</span> },
    {
      key: 'invoiceCount',
      header: 'Factures',
      align: 'center',
      sortable: true,
      sortValue: (c) => clientStats.get(c.id)?.count ?? 0,
      render: (c) => <span>{clientStats.get(c.id)?.count ?? 0}</span>,
    },
    {
      key: 'totalBilled',
      header: 'Total facturé',
      align: 'right',
      sortable: true,
      sortValue: (c) => clientStats.get(c.id)?.total ?? 0,
      render: (c) => <span className="font-medium">{formatCurrency(clientStats.get(c.id)?.total ?? 0, currency)}</span>,
    },
    {
      key: 'balance',
      header: 'Solde',
      align: 'right',
      sortable: true,
      sortValue: (c) => {
        const s = clientStats.get(c.id);
        return s ? s.total - s.paid : 0;
      },
      render: (c) => {
        const s = clientStats.get(c.id);
        const balance = s ? s.total - s.paid : 0;
        return (
          <span className={balance > 0 ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-gray-400'}>
            {formatCurrency(balance, currency)}
          </span>
        );
      },
    },
    {
      key: 'lastActivity',
      header: 'Activité',
      sortable: true,
      sortValue: (c) => c.lastActivityAt,
      render: (c) => <span className="text-xs text-gray-400">{formatRelative(c.lastActivityAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Modifier" side="top">
            <button
              onClick={() => navigate(`/clients/${c.id}/edit`)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              aria-label="Modifier"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Supprimer" side="top">
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: 'Supprimer le client',
                  message: `Voulez-vous vraiment supprimer "${c.name}" ?`,
                  confirmLabel: 'Supprimer',
                  variant: 'danger',
                });
                if (ok) {
                  await services.clients.remove(c.id);
                  push('success', 'Client supprimé');
                  reload();
                }
              }}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        description={`${filtered.length} client(s)`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditingGroup(null); setGroupForm({ name: '', color: colorPalette[0], description: '' }); setGroupDialogOpen(true); }}>
              <Users2 className="h-4 w-4" /> Groupes
            </Button>
            <Button onClick={() => navigate('/clients/new')}>
              <Plus className="h-4 w-4" /> Nouveau client
            </Button>
          </div>
        }
      />
      <PageContent>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-800">
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un client..." className="max-w-xs" />
            {groups.length > 0 && (
              <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-auto text-xs">
                <option value="all">Tous les groupes</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            )}
            <div className="ml-auto">
              <ExportImportButton
                data={filtered}
                columns={exportColumns}
                filename="clients"
                onImport={handleImport}
              />
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedKeys.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-accent-50 px-4 py-2.5 dark:bg-accent-900/20">
              <span className="text-sm font-medium text-accent-700 dark:text-accent-300">{selectedKeys.length} sélectionné(s)</span>
              <div className="flex flex-wrap gap-2">
                {groups.length > 0 && (
                  <Select
                    value=""
                    onChange={(e) => { if (e.target.value) handleBulkAssignGroup(e.target.value); }}
                    className="w-auto text-xs"
                  >
                    <option value="">Assigner à un groupe...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </Select>
                )}
                <Button variant="danger" size="sm" onClick={handleBulkDelete}><Trash2 className="h-3.5 w-3.5" /> Supprimer</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedKeys([])}><X className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}

          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun client"
              description="Commencez par ajouter votre premier client"
              action={
                <Button onClick={() => navigate('/clients/new')}>
                  <Plus className="h-4 w-4" /> Ajouter un client
                </Button>
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              rowKey={(c) => c.id}
              onRowClick={(c) => navigate(`/clients/${c.id}`)}
              defaultSort={{ key: 'name', dir: 'asc' }}
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
            />
          )}
        </Card>
      </PageContent>

      {/* Group dialog */}
      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} title={editingGroup ? 'Modifier le groupe' : 'Nouveau groupe'} size="md" footer={<>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Annuler</Button>
  <Button onClick={handleSaveGroup}>{editingGroup ? 'Modifier' : 'Créer'}</Button>
</>}>
        <div className="space-y-4 p-5">
          <Field label="Nom" required><Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Ex: VIP" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveGroup(); }} /></Field>
          <Field label="Description"><Input value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} /></Field>
          <Field label="Couleur">
            <div className="flex flex-wrap gap-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setGroupForm({ ...groupForm, color })}
                  className={cn('h-8 w-8 rounded-full border-2 transition-all', groupForm.color === color ? 'border-gray-900 scale-110 dark:border-white' : 'border-transparent')}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Field>

          {groups.length > 0 && (
            <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
              <p className="mb-2 text-[13px] font-medium text-gray-500">Groupes existants <span className="num text-gray-400">({groups.length})</span></p>
              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {groups.map((group) => (
                <div key={group.id} className={cn('flex items-center justify-between rounded-lg border px-3 py-2', editingGroup?.id === group.id ? 'border-accent-400 bg-accent-50/50 dark:bg-accent-500/10' : 'border-gray-200 dark:border-gray-800')}>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="text-sm font-medium">{group.name}</span>
                    {group.description && <span className="text-xs text-gray-400">— {group.description}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      aria-label="Modifier"
                      onClick={() => { setEditingGroup(group); setGroupForm({ name: group.name, color: group.color, description: group.description ?? '' }); }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label="Supprimer"
                      onClick={() => handleDeleteGroup(group)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}