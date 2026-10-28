import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, FileCheck2, Eye, Filter, X } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { QuoteStatusBadge } from '@/components/ui/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { useConfirm } from '@/app/providers/ConfirmContext';
import { formatCurrency, formatDate } from '@/utils/format';
import { computeTotals } from '@/utils/calc';
import { quoteStatusLabels } from '@/utils/labels';
import { Tooltip } from '@/components/ui/Tooltip';
import { Field, Input, Select } from '@/components/ui/Input';
import type { Quote, QuoteStatus } from '@/types';

export default function QuotesListPage() {
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
  const { data: quotes, loading, error, reload } = useAsync(() => services.quotes.list({ search }), [search]);
  const { data: clients } = useAsync(() => services.clients.list(), []);

  const clientName = (id: string) => (clients ?? []).find((c) => c.id === id)?.name ?? '—';

  const dateRangeError = dateFrom && dateTo && dateFrom > dateTo;

  const filtered = useMemo(() => {
    if (dateRangeError) return [];
    return (quotes ?? []).filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (clientFilter !== 'all' && q.clientId !== clientFilter) return false;
      if (dateFrom && q.date < dateFrom) return false;
      if (dateTo && q.date > dateTo) return false;
      const total = computeTotals(q.items).totalTTC;
      if (minAmount && total < Number(minAmount)) return false;
      if (maxAmount && total > Number(maxAmount)) return false;
      return true;
    });
  }, [quotes, statusFilter, clientFilter, dateFrom, dateTo, minAmount, maxAmount, dateRangeError]);

  const hasActiveFilters = clientFilter !== 'all' || dateFrom || dateTo || minAmount || maxAmount;
  const clearFilters = () => { setClientFilter('all'); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount(''); };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of quotes ?? []) counts[q.status] = (counts[q.status] ?? 0) + 1;
    return counts;
  }, [quotes]);

  const handleConvert = async (q: Quote) => {
    const ok = await confirm({
      title: 'Convertir en facture',
      message: `Convertir le devis ${q.number} en facture ?`,
      confirmLabel: 'Convertir',
    });
    if (ok) {
      const invoice = await services.quotes.convertToInvoice(q.id);
      push('success', 'Devis converti en facture', invoice.number);
      navigate(`/invoices/${invoice.id}`);
    }
  };

  const columns: Column<Quote>[] = [
    { key: 'number', header: 'Numéro', sortable: true, sortValue: (q) => q.number, render: (q) => <span className="font-medium">{q.number}</span> },
    { key: 'client', header: 'Client', render: (q) => <span className="text-gray-700 dark:text-gray-300">{clientName(q.clientId)}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (q) => q.date, render: (q) => formatDate(q.date) },
    { key: 'expiryDate', header: 'Expiration', render: (q) => <span className="text-gray-600">{formatDate(q.expiryDate)}</span> },
    { key: 'total', header: 'Total TTC', align: 'right', sortable: true, sortValue: (q) => computeTotals(q.items).totalTTC, render: (q) => <span className="font-medium">{formatCurrency(computeTotals(q.items).totalTTC)}</span> },
    { key: 'status', header: 'Statut', render: (q) => <QuoteStatusBadge status={q.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (q) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {q.status === 'accepte' && (
            <Tooltip label="Convertir en facture" side="top">
              <button onClick={() => handleConvert(q)} className="rounded p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" aria-label="Convertir en facture">
                <FileCheck2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip label="Voir" side="top">
            <button onClick={() => navigate(`/quotes/${q.id}`)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Voir">
              <Eye className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Supprimer" side="top">
            <button
              onClick={async () => {
                await services.quotes.remove(q.id);
                push('success', 'Devis supprimé');
                reload();
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
        title="Devis"
        description={`${filtered.length} devis`}
        actions={<Button onClick={() => navigate('/quotes/new')}><Plus className="h-4 w-4" /> Nouveau devis</Button>}
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
            <Tabs active={statusFilter} onChange={setStatusFilter} tabs={['all', 'brouillon', 'envoye', 'attente', 'accepte', 'refuse', 'expire'].map((s) => ({ key: s, label: s === 'all' ? 'Tous' : quoteStatusLabels[s as QuoteStatus], count: s === 'all' ? undefined : (statusCounts[s] ?? 0) }))} />
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
              <p className="text-xs text-amber-600 dark:text-amber-400">La date « du » est postérieure à la date « au ». Aucun devis ne correspond à cette période.</p>
            )}
            </div>
          )}
          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : dateRangeError ? (
            <EmptyState
              icon={FileText}
              title="Période invalide"
              description="La date « du » est postérieure à la date « au ». Corrigez les dates pour afficher vos devis."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun devis"
              description="Créez votre premier devis"
              action={<Button onClick={() => navigate('/quotes/new')}><Plus className="h-4 w-4" /> Nouveau devis</Button>}
            />
          ) : (
            <DataTable columns={columns} data={filtered} rowKey={(q) => q.id} onRowClick={(q) => navigate(`/quotes/${q.id}`)} defaultSort={{ key: 'date', dir: 'desc' }} />
          )}
        </Card>
      </PageContent>
    </div>
  );
}