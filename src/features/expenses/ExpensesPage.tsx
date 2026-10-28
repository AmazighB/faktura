import { useMemo, useState } from 'react';
import { Plus, Wallet, Trash2, Edit3, Filter, X } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { formatCurrency, formatDate, toISODate } from '@/utils/format';
import { expenseCategoryLabels, paymentMethodLabels } from '@/utils/labels';
import { expenseCategoryDot } from '@/utils/styles';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types';

const emptyExpense: Omit<Expense, 'id' | 'createdAt'> = {
  date: toISODate(), supplierId: '', supplierName: '', category: 'autre',
  description: '', amountHT: 0, vatRate: 19, amountTTC: 0, method: 'especes', note: '',
};

export default function ExpensesPage() {
  const { push } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyExpense);
  const [saving, setSaving] = useState(false);

  const { data: expenses, loading, error, reload } = useAsync(() => services.expenses.list({ search }), [search]);
  const { data: suppliers } = useAsync(() => services.suppliers.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);
  const currency = settings?.currency ?? 'DA';

  // Category labels and colors from settings (fall back to hardcoded)
  const expenseCatConfig = useMemo(() => {
    const cats = settings?.expenseCategories ?? [];
    const labelMap: Record<string, string> = {};
    const colorMap: Record<string, string> = {};
    cats.forEach((c) => { labelMap[c.id] = c.name; colorMap[c.id] = c.color; });
    // Merge with built-in labels for backward compat
    Object.entries(expenseCategoryLabels).forEach(([k, v]) => { if (!labelMap[k]) labelMap[k] = v; });
    Object.entries(expenseCategoryDot).forEach(([k, v]) => { if (!colorMap[k]) colorMap[k] = v; });
    return { labelMap, colorMap };
  }, [settings]);
  const catLabel = (cat: string) => expenseCatConfig.labelMap[cat] ?? cat;
  const catColor = (cat: string) => expenseCatConfig.colorMap[cat] ?? 'bg-gray-400';

  const dateRangeError = dateFrom && dateTo && dateFrom > dateTo;

  const filtered = useMemo(() => {
    if (dateRangeError) return [];
    return (expenses ?? []).filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (supplierFilter !== 'all') {
        if (supplierFilter === 'none' && e.supplierId) return false;
        if (supplierFilter !== 'none' && e.supplierId !== supplierFilter) return false;
      }
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      if (minAmount && e.amountTTC < Number(minAmount)) return false;
      if (maxAmount && e.amountTTC > Number(maxAmount)) return false;
      return true;
    });
  }, [expenses, categoryFilter, supplierFilter, dateFrom, dateTo, minAmount, maxAmount, dateRangeError]);

  const hasActiveFilters = categoryFilter !== 'all' || supplierFilter !== 'all' || dateFrom || dateTo || minAmount || maxAmount;
  const clearFilters = () => { setCategoryFilter('all'); setSupplierFilter('all'); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount(''); };

  // Répartition par catégorie (sur les dépenses filtrées), de la plus grosse à la plus petite
  const byCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    filtered.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amountTTC));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const totalExpenses = useMemo(() => filtered.reduce((s, e) => s + e.amountTTC, 0), [filtered]);

  const openNew = () => { setEditing(null); setForm(emptyExpense); setDialogOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setForm({ ...e }); setDialogOpen(true); };

  const updateAmountTTC = (ht: number, vat: number) => {
    setForm((f) => ({ ...f, amountHT: ht, vatRate: vat, amountTTC: ht * (1 + vat / 100) }));
  };

  const handleSave = async () => {
    if (!form.description.trim()) { push('error', 'La description est obligatoire'); return; }
    setSaving(true);
    try {
      if (editing) {
        await services.expenses.update(editing.id, form);
        push('success', 'Dépense modifiée');
      } else {
        await services.expenses.create(form);
        push('success', 'Dépense enregistrée');
      }
      setDialogOpen(false);
      reload();
    } catch {
      push('error', 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Expense>[] = [
    { key: 'date', header: 'Date', sortable: true, sortValue: (e) => e.date, render: (e) => formatDate(e.date) },
    { key: 'supplier', header: 'Fournisseur', render: (e) => <span className="text-gray-700 dark:text-gray-300">{e.supplierName || '—'}</span> },
    {
      key: 'category', header: 'Catégorie',
      render: (e) => (
        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" dot={catColor(e.category)}>
          {catLabel(e.category)}
        </Badge>
      ),
    },
    { key: 'description', header: 'Description', render: (e) => <span className="text-gray-700 dark:text-gray-300">{e.description}</span> },
    { key: 'amountHT', header: 'HT', align: 'right', render: (e) => <span className="num-amount">{formatCurrency(e.amountHT, currency)}</span> },
    { key: 'amountTTC', header: 'TTC', align: 'right', sortable: true, sortValue: (e) => e.amountTTC, render: (e) => <span className="num-amount font-medium">{formatCurrency(e.amountTTC, currency)}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: (e) => (
        <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
          <Tooltip label="Modifier" side="top">
            <button onClick={() => openEdit(e)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Modifier">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Supprimer" side="top">
            <button
              onClick={async () => {
                const ok = await confirm({ title: 'Supprimer', message: 'Supprimer cette dépense ?', confirmLabel: 'Supprimer', variant: 'danger' });
                if (ok) { await services.expenses.remove(e.id); push('success', 'Dépense supprimée'); reload(); }
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
        title="Dépenses"
        description={`${expenses?.length ?? 0} dépense(s) · Total: ${formatCurrency(totalExpenses, currency)}`}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> Nouvelle dépense</Button>}
      />
      <PageContent>
        {byCategory.length > 0 && (
          <Card className="mb-5 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="label-quiet">Où part l'argent</p>
              <p className="num-amount text-sm font-semibold">{formatCurrency(totalExpenses, currency)}</p>
            </div>
            <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Répartition des dépenses par catégorie">
              {byCategory.map(([cat, amount]) => (
                <div key={cat} className={cn('origin-left animate-grow-x', catColor(cat))} style={{ width: `${(amount / Math.max(totalExpenses, 1)) * 100}%` }} title={`${catLabel(cat)} : ${formatCurrency(amount, currency)}`} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {byCategory.map(([cat, amount]) => (
                <button key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)} aria-pressed={categoryFilter === cat}
                  className={cn('inline-flex items-center gap-2 rounded-md px-1.5 py-0.5 text-[13px] transition-colors hover:bg-gray-100 dark:hover:bg-gray-800', categoryFilter === cat && 'bg-gray-100 font-medium dark:bg-gray-800')}>
                  <span className={cn('h-2 w-2 rounded-full', catColor(cat))} />
                  <span className="text-gray-600 dark:text-gray-300">{catLabel(cat)}</span>
                  <span className="num text-gray-400">{Math.round((amount / Math.max(totalExpenses, 1)) * 100)} %</span>
                </button>
              ))}
            </div>
          </Card>
        )}
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-800">
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par description, fournisseur..." className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-3.5 w-3.5" /> Filtres
              {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-accent-500" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Effacer</Button>
            )}
          </div>
          {showFilters && (
            <div className="space-y-3 border-b border-gray-200 p-3 dark:border-gray-800">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Field label="Catégorie">
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">Toutes</option>
                  {Object.entries(expenseCatConfig.labelMap).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </Select>
              </Field>
              <Field label="Fournisseur">
                <Select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                  <option value="all">Tous</option>
                  <option value="none">Aucun</option>
                  {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Date du"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
              <Field label="Date au"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
              <Field label="Montant min"><Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" /></Field>
              <Field label="Montant max"><Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="∞" /></Field>
            </div>
            {dateRangeError && (
              <p className="text-xs text-amber-600 dark:text-amber-400">La date « du » est postérieure à la date « au ». Aucune dépense ne correspond à cette période.</p>
            )}
            </div>
          )}
          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : dateRangeError ? (
            <EmptyState icon={Wallet} title="Période invalide" description="La date « du » est postérieure à la date « au ». Corrigez les dates pour afficher vos dépenses." />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Wallet} title="Aucune dépense" description="Enregistrez vos dépenses" action={<Button onClick={openNew}><Plus className="h-4 w-4" /> Ajouter</Button>} />
          ) : (
            <DataTable columns={columns} data={filtered} rowKey={(e) => e.id} defaultSort={{ key: 'date', dir: 'desc' }} />
          )}
        </Card>
      </PageContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? 'Modifier la dépense' : 'Nouvelle dépense'} size="md" footer={<><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button></>}>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Fournisseur">
              <Select value={form.supplierId} onChange={(e) => {
                const sup = (suppliers ?? []).find((s) => s.id === e.target.value);
                setForm({ ...form, supplierId: e.target.value, supplierName: sup?.name ?? form.supplierName });
              }}>
                <option value="">— Aucun —</option>
                {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description" required><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
                {Object.entries(expenseCatConfig.labelMap).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </Select>
            </Field>
            <Field label="Mode de paiement">
              <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>
                {Object.entries(paymentMethodLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Montant HT"><Input type="number" value={form.amountHT} onChange={(e) => updateAmountTTC(Number(e.target.value), form.vatRate)} /></Field>
            <Field label="TVA (%)"><Input type="number" value={form.vatRate} onChange={(e) => updateAmountTTC(form.amountHT, Number(e.target.value))} /></Field>
            <Field label="TTC"><Input value={formatCurrency(form.amountTTC, currency)} disabled /></Field>
          </div>
          <Field label="Note"><Textarea className="min-h-[50px]" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        </div>
      </Dialog>
    </div>
  );
}