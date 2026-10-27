import { useState } from 'react';
import { Plus, Truck, Edit3, Trash2, Phone, Mail, MapPin, Filter, X } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { Field, Input, Textarea, Select } from '@/components/ui/Input';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { formatCurrency } from '@/utils/format';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Supplier } from '@/types';

const empty: Omit<Supplier, 'id' | 'createdAt'> = {
  name: '', phone: '', email: '', address: '', nif: '', notes: '',
};

export default function SuppliersPage() {
  const { push } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hasEmail, setHasEmail] = useState<string>('all');
  const [hasPhone, setHasPhone] = useState<string>('all');
  const [hasExpenses, setHasExpenses] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  const { data: suppliers, loading, error, reload } = useAsync(() => services.suppliers.list({ search }), [search]);
  const { data: expenses } = useAsync(() => services.expenses.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);
  const currency = settings?.currency ?? 'DA';

  const openNew = () => { setEditing(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ ...s }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { push('error', 'Le nom est obligatoire'); return; }
    setSaving(true);
    try {
      if (editing) {
        await services.suppliers.update(editing.id, form);
        push('success', 'Fournisseur modifié');
      } else {
        await services.suppliers.create(form);
        push('success', 'Fournisseur créé');
      }
      setDialogOpen(false);
      reload();
    } catch {
      push('error', 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const supplierExpenses = (expenses ?? []).filter((e) => e.supplierId === detailSupplier?.id);
  const supplierTotal = supplierExpenses.reduce((s, e) => s + e.amountTTC, 0);

  const filtered = (suppliers ?? []).filter((s) => {
    if (hasEmail === 'yes' && !s.email) return false;
    if (hasEmail === 'no' && s.email) return false;
    if (hasPhone === 'yes' && !s.phone) return false;
    if (hasPhone === 'no' && s.phone) return false;
    const hasExp = (expenses ?? []).some((e) => e.supplierId === s.id);
    if (hasExpenses === 'yes' && !hasExp) return false;
    if (hasExpenses === 'no' && hasExp) return false;
    return true;
  });

  const hasActiveFilters = hasEmail !== 'all' || hasPhone !== 'all' || hasExpenses !== 'all';
  const clearFilters = () => { setHasEmail('all'); setHasPhone('all'); setHasExpenses('all'); };

  const columns: Column<Supplier>[] = [
    { key: 'name', header: 'Nom', sortable: true, sortValue: (s) => s.name, render: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'phone', header: 'Téléphone', render: (s) => <span className="text-gray-600">{s.phone || '—'}</span> },
    { key: 'email', header: 'Email', render: (s) => <span className="text-gray-600">{s.email || '—'}</span> },
    {
      key: 'expenseCount', header: 'Dépenses', align: 'center',
      render: (s) => <span>{(expenses ?? []).filter((e) => e.supplierId === s.id).length}</span>,
    },
    {
      key: 'total', header: 'Total dépenses', align: 'right',
      render: (s) => <span className="font-medium">{formatCurrency((expenses ?? []).filter((e) => e.supplierId === s.id).reduce((sum, e) => sum + e.amountTTC, 0), currency)}</span>,
    },
    {
      key: 'actions', header: '', align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Modifier" side="top">
            <button onClick={() => openEdit(s)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Modifier">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Supprimer" side="top">
            <button
              onClick={async () => {
                const ok = await confirm({ title: 'Supprimer', message: `Supprimer "${s.name}" ?`, confirmLabel: 'Supprimer', variant: 'danger' });
                if (ok) { await services.suppliers.remove(s.id); push('success', 'Fournisseur supprimé'); reload(); }
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
        title="Fournisseurs"
        description={`${suppliers?.length ?? 0} fournisseur(s)`}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> Nouveau</Button>}
      />
      <PageContent>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-800">
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom, email, téléphone..." className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-3.5 w-3.5" /> Filtres
              {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-accent-500" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Effacer</Button>
            )}
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-3 dark:border-gray-800 sm:grid-cols-3">
              <Field label="Email">
                <Select value={hasEmail} onChange={(e) => setHasEmail(e.target.value)}>
                  <option value="all">Tous</option>
                  <option value="yes">Avec email</option>
                  <option value="no">Sans email</option>
                </Select>
              </Field>
              <Field label="Téléphone">
                <Select value={hasPhone} onChange={(e) => setHasPhone(e.target.value)}>
                  <option value="all">Tous</option>
                  <option value="yes">Avec téléphone</option>
                  <option value="no">Sans téléphone</option>
                </Select>
              </Field>
              <Field label="Dépenses">
                <Select value={hasExpenses} onChange={(e) => setHasExpenses(e.target.value)}>
                  <option value="all">Tous</option>
                  <option value="yes">Avec dépenses</option>
                  <option value="no">Sans dépenses</option>
                </Select>
              </Field>
            </div>
          )}
          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Truck} title="Aucun fournisseur" description="Ajoutez vos fournisseurs" action={<Button onClick={openNew}><Plus className="h-4 w-4" /> Ajouter</Button>} />
          ) : (
            <DataTable columns={columns} data={filtered} rowKey={(s) => s.id} onRowClick={setDetailSupplier} defaultSort={{ key: 'name', dir: 'asc' }} />
          )}
        </Card>
      </PageContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? 'Modifier' : 'Nouveau fournisseur'} size="md">
        <div className="space-y-4 p-5">
          <Field label="Nom / Raison sociale" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <Field label="Adresse"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="NIF"><Input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} /></Field>
          <Field label="Notes"><Textarea className="min-h-[50px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </div>
      </Dialog>

      <Drawer open={!!detailSupplier} onClose={() => setDetailSupplier(null)} title={detailSupplier?.name} width="max-w-md">
        {detailSupplier && (
          <div className="space-y-5 p-5">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400"><Phone className="h-4 w-4 text-gray-400" /> {detailSupplier.phone || '—'}</div>
              <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400"><Mail className="h-4 w-4 text-gray-400" /> {detailSupplier.email || '—'}</div>
              <div className="flex items-start gap-2.5 text-gray-600 dark:text-gray-400"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /> {detailSupplier.address || '—'}</div>
            </div>
            {detailSupplier.nif && (
              <div className="text-sm">
                <span className="text-gray-500">NIF: </span>
                <span className="font-medium">{detailSupplier.nif}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Historique des dépenses</h4>
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(supplierTotal, currency)}</span>
              </div>
              {supplierExpenses.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune dépense</p>
              ) : (
                <div className="space-y-2">
                  {supplierExpenses.map((e) => (
                    <div key={e.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{e.description}</span>
                      <span className="font-medium">{formatCurrency(e.amountTTC, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {detailSupplier.notes && (
              <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                <h4 className="text-sm font-semibold mb-1">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{detailSupplier.notes}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
