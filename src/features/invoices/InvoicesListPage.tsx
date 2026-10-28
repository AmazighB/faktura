import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, Copy, Trash2, Eye, CreditCard, Filter, X } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { InvoiceStatusBadge } from '@/components/ui/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { useConfirm } from '@/app/providers/ConfirmContext';
import { formatCurrency, formatDate } from '@/utils/format';
import { computeTotals } from '@/utils/calc';
import { invoiceStatusLabels } from '@/utils/labels';
import { Tooltip } from '@/components/ui/Tooltip';
import { Field, Input, Select } from '@/components/ui/Input';
import type { Invoice, InvoiceStatus } from '@/types';

export default function InvoicesListPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const { data: invoices, loading, error, reload } = useAsync(() => services.invoices.list({ search }), [search]);
  const { data: clients } = useAsync(() => services.clients.list(), []);

  const clientName = (id: string) => (clients ?? []).find((c) => c.id === id)?.name ?? '—';

  const dateRangeError = dateFrom && dateTo && dateFrom > dateTo;

  const filtered = useMemo(() => {
    if (dateRangeError) return [];
    return (invoices ?? []).filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (clientFilter !== 'all' && i.clientId !== clientFilter) return false;
      if (dateFrom && i.date < dateFrom) return false;
      if (dateTo && i.date > dateTo) return false;
      const total = computeTotals(i.items).totalTTC;
      if (minAmount && total < Number(minAmount)) return false;
      if (maxAmount && total > Number(maxAmount)) return false;
      return true;
    });
  }, [invoices, statusFilter, clientFilter, dateFrom, dateTo, minAmount, maxAmount, dateRangeError]);

  const hasActiveFilters = clientFilter !== 'all' || dateFrom || dateTo || minAmount || maxAmount;

  const clearFilters = () => {
    setClientFilter('all');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of invoices ?? []) counts[i.status] = (counts[i.status] ?? 0) + 1;
    return counts;
  }, [invoices]);

  const handleDuplicate = async (inv: Invoice) => {
    const copy = await services.invoices.duplicate(inv.id);
    push('success', 'Facture dupliquée', copy.number);
    navigate(`/invoices/${copy.id}`);
  };

  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Numéro', sortable: true, sortValue: (i) => i.number, render: (i) => <span className="font-medium">{i.number}</span> },
    { key: 'client', header: 'Client', render: (i) => <span className="text-gray-700 dark:text-gray-300">{clientName(i.clientId)}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (i) => i.date, render: (i) => formatDate(i.date) },
    { key: 'dueDate', header: 'Échéance', render: (i) => <span className="text-gray-600">{formatDate(i.dueDate)}</span> },
    { key: 'total', header: 'Total TTC', align: 'right', sortable: true, sortValue: (i) => computeTotals(i.items).totalTTC, render: (i) => <span className="num-amount font-medium">{formatCurrency(computeTotals(i.items).totalTTC)}</span> },
    {
      key: 'paid',
      header: 'Payé',
      align: 'right',
      render: (i) => <span className={`num-amount ${(i.paidAmount + (i.creditNotesApplied ?? 0)) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>{formatCurrency(i.paidAmount + (i.creditNotesApplied ?? 0))}</span>,
    },
    { key: 'status', header: 'Statut', render: (i) => <InvoiceStatusBadge status={i.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {(i.status === 'emise' || i.status === 'partielle' || i.status === 'retard') && (
            <Tooltip label="Enregistrer un paiement" side="top">
              <button onClick={() => navigate(`/payments/new/${i.id}`)} className="rounded p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" aria-label="Enregistrer un paiement">
                <CreditCard className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip label="Voir" side="top">
            <button onClick={() => navigate(`/invoices/${i.id}`)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Voir">
              <Eye className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Dupliquer" side="top">
            <button onClick={() => handleDuplicate(i)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Dupliquer">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          {i.status === 'brouillon' && (
            <Tooltip label="Supprimer" side="top">
              <button
                onClick={async () => {
                  const ok = await confirm({ title: 'Supprimer', message: `Supprimer la facture ${i.number} ?`, confirmLabel: 'Supprimer', variant: 'danger' });
                  if (ok) {
                    await services.invoices.remove(i.id);
                    push('success', 'Facture supprimée');
                    reload();
                  }
                }}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Factures"
        description={`${filtered.length} facture(s)`}
        actions={<Button onClick={() => navigate('/invoices/new')}><Plus className="h-4 w-4" /> Nouvelle facture</Button>}
      />
      <PageContent>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-800">
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par numéro, client..." className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-3.5 w-3.5" /> Filtres
              {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-accent-500" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Effacer</Button>
            )}
            <Tabs
              active={statusFilter}
              onChange={setStatusFilter}
              tabs={['all', 'brouillon', 'emise', 'partielle', 'payee', 'retard', 'annulee'].map((k) => ({
                key: k,
                label: k === 'all' ? 'Toutes' : invoiceStatusLabels[k as InvoiceStatus],
                count: k === 'all' ? (invoices ?? []).length : statusCounts[k] ?? 0,
              }))}
            />
          </div>
          {showFilters && (
            <div className="space-y-3 border-b border-gray-200 p-3 dark:border-gray-800">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Field label="Client">
                <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                  <option value="all">Tous les clients</option>
                  {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Date du"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
              <Field label="Date au"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
              <Field label="Montant min"><Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" /></Field>
              <Field label="Montant max"><Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="∞" /></Field>
            </div>
            {dateRangeError && (
              <p className="text-xs text-amber-600 dark:text-amber-400">La date « du » est postérieure à la date « au ». Aucune facture ne correspond à cette période.</p>
            )}
            </div>
          )}
          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : dateRangeError ? (
            <EmptyState
              icon={Receipt}
              title="Période invalide"
              description="La date « du » est postérieure à la date « au ». Corrigez les dates pour afficher vos factures."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Aucune facture"
              description="Créez votre première facture"
              action={<Button onClick={() => navigate('/invoices/new')}><Plus className="h-4 w-4" /> Nouvelle facture</Button>}
            />
          ) : (
            <DataTable columns={columns} data={filtered} rowKey={(i) => i.id} onRowClick={(i) => navigate(`/invoices/${i.id}`)} defaultSort={{ key: 'date', dir: 'desc' }} />
          )}
        </Card>
      </PageContent>
    </div>
  );
}