import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CreditCard, Trash2, Filter, X } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { formatCurrency, formatDate } from '@/utils/format';
import { paymentMethodLabels } from '@/utils/labels';
import { Tooltip } from '@/components/ui/Tooltip';
import { Field, Input, Select } from '@/components/ui/Input';
import type { Payment, PaymentMethod } from '@/types';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const { data: payments, loading, error, reload } = useAsync(() => services.payments.list({ search }), [search]);
  const { data: clients } = useAsync(() => services.clients.list(), []);
  const { data: invoices } = useAsync(() => services.invoices.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);

  const clientName = (id: string) => (clients ?? []).find((c) => c.id === id)?.name ?? '—';
  const invoiceNumber = (id: string) => (invoices ?? []).find((i) => i.id === id)?.number ?? '—';
  const currency = settings?.currency ?? 'DA';

  const filtered = useMemo(() => {
    return (payments ?? []).filter((p) => {
      if (clientFilter !== 'all' && p.clientId !== clientFilter) return false;
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;
      if (dateFrom && p.date < dateFrom) return false;
      if (dateTo && p.date > dateTo) return false;
      if (minAmount && p.amount < Number(minAmount)) return false;
      if (maxAmount && p.amount > Number(maxAmount)) return false;
      return true;
    });
  }, [payments, clientFilter, methodFilter, dateFrom, dateTo, minAmount, maxAmount]);

  const hasActiveFilters = clientFilter !== 'all' || methodFilter !== 'all' || dateFrom || dateTo || minAmount || maxAmount;
  const clearFilters = () => { setClientFilter('all'); setMethodFilter('all'); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount(''); };

  const totalReceived = useMemo(() => filtered.reduce((s, p) => s + p.amount, 0), [filtered]);

  const columns: Column<Payment>[] = [
    { key: 'number', header: 'Numéro', sortable: true, sortValue: (p) => p.number, render: (p) => <span className="font-medium">{p.number}</span> },
    { key: 'client', header: 'Client', render: (p) => <span className="text-gray-700 dark:text-gray-300">{clientName(p.clientId)}</span> },
    { key: 'invoice', header: 'Facture', render: (p) => <button onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${p.invoiceId}`); }} className="text-accent-600 hover:underline">{invoiceNumber(p.invoiceId)}</button> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (p) => p.date, render: (p) => formatDate(p.date) },
    { key: 'method', header: 'Mode', render: (p) => <span className="text-gray-600">{paymentMethodLabels[p.method]}</span> },
    { key: 'amount', header: 'Montant', align: 'right', sortable: true, sortValue: (p) => p.amount, render: (p) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount, currency)}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: (p) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Supprimer" side="top">
            <button
              onClick={async () => {
                const ok = await confirm({ title: 'Supprimer', message: 'Supprimer ce paiement ?', confirmLabel: 'Supprimer', variant: 'danger' });
                if (ok) { await services.payments.remove(p.id); push('success', 'Paiement supprimé'); reload(); }
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
        title="Paiements"
        description={`${(payments ?? []).length} paiement(s) · Total: ${formatCurrency(totalReceived, currency)}`}
        actions={<Button onClick={() => navigate('/payments/new')}><Plus className="h-4 w-4" /> Nouveau paiement</Button>}
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
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-3 dark:border-gray-800 sm:grid-cols-3 lg:grid-cols-4">
              <Field label="Client">
                <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                  <option value="all">Tous</option>
                  {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Mode de paiement">
                <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                  <option value="all">Tous</option>
                  {Object.entries(paymentMethodLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </Select>
              </Field>
              <Field label="Date du"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
              <Field label="Date au"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
              <Field label="Montant min"><Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" /></Field>
              <Field label="Montant max"><Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="∞" /></Field>
            </div>
          )}
          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Aucun paiement"
              description="Enregistrez vos paiements reçus"
              action={<Button onClick={() => navigate('/payments/new')}><Plus className="h-4 w-4" /> Enregistrer</Button>}
            />
          ) : (
            <DataTable columns={columns} data={filtered} rowKey={(p) => p.id} defaultSort={{ key: 'date', dir: 'desc' }} />
          )}
        </Card>
      </PageContent>
    </div>
  );
}
