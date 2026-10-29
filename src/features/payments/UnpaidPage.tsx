import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CreditCard, Eye, Send } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Tooltip } from '@/components/ui/Tooltip';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { InvoiceStatusBadge } from '@/components/ui/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { formatCurrency, formatDate, daysUntil } from '@/utils/format';
import type { Invoice } from '@/types';
import { amountDue } from '@/utils/invoice';

type Filter = 'all' | 'upcoming' | 'overdue' | 'partial';

export default function UnpaidPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: invoices, loading, error, reload } = useAsync(() => services.invoices.list(), []);
  const { data: clients } = useAsync(() => services.clients.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);
  const currency = settings?.currency ?? 'DA';

  const clientName = (id: string) => (clients ?? []).find((c) => c.id === id)?.name ?? '—';

  const unpaidInvoices = useMemo(() => {
    return (invoices ?? []).filter((i) =>
      i.status === 'emise' || i.status === 'partielle' || i.status === 'retard',
    );
  }, [invoices]);

  const filtered = useMemo(() => {
    return unpaidInvoices.filter((i) => {
      const overdue = i.status === 'retard';
      const partial = i.status === 'partielle';
      if (filter === 'overdue') return overdue;
      if (filter === 'upcoming') return !overdue;
      if (filter === 'partial') return partial;
      return true;
    });
  }, [unpaidInvoices, filter]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, i) => s + amountDue(i), 0);
    const overdueTotal = filtered
      .filter((i) => daysUntil(i.dueDate) < 0)
      .reduce((s, i) => s + amountDue(i), 0);
    return { total, overdueTotal };
  }, [filtered]);

  const columns: Column<Invoice>[] = [
    { key: 'client', header: 'Client', render: (i) => <span className="font-medium">{clientName(i.clientId)}</span> },
    { key: 'number', header: 'Facture', render: (i) => <span className="text-gray-600">{i.number}</span> },
    { key: 'dueDate', header: 'Échéance', sortable: true, sortValue: (i) => i.dueDate, render: (i) => formatDate(i.dueDate) },
    {
      key: 'amount',
      header: 'Montant dû',
      align: 'right',
      sortable: true,
      sortValue: (i) => amountDue(i),
      render: (i) => <span className="font-semibold">{formatCurrency(amountDue(i), currency)}</span>,
    },
    {
      key: 'late',
      header: 'Retard',
      align: 'right',
      render: (i) => {
        const days = daysUntil(i.dueDate);
        if (days < 0) return <span className="text-red-600 dark:text-red-400 font-medium">{Math.abs(days)} jours</span>;
        if (days === 0) return <span className="text-amber-600 dark:text-amber-400">Aujourd'hui</span>;
        return <span className="text-gray-400">dans {days}j</span>;
      },
    },
    { key: 'status', header: 'Statut', render: (i) => <InvoiceStatusBadge status={i.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Voir">
            <button onClick={() => navigate(`/invoices/${i.id}`)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Voir">
              <Eye className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label="Paiement">
            <button onClick={() => navigate(`/payments/new/${i.id}`)} className="rounded p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" aria-label="Paiement">
              <CreditCard className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label="Relancer">
            <button
              onClick={() => push('info', 'Relance envoyée', `Email de relance pour ${i.number}`)}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              aria-label="Relancer"
            >
              <Send className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Toutes', count: unpaidInvoices.length },
    { key: 'upcoming', label: 'À venir', count: unpaidInvoices.filter((i) => daysUntil(i.dueDate) >= 0).length },
    { key: 'overdue', label: 'En retard', count: unpaidInvoices.filter((i) => daysUntil(i.dueDate) < 0).length },
    { key: 'partial', label: 'Partiellement payées', count: unpaidInvoices.filter((i) => i.status === 'partielle').length },
  ];

  return (
    <div>
      <PageHeader title="À encaisser" description="Suivi des factures impayées" />
      <PageContent>
        <Card className="mb-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden dark:divide-gray-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5"><p className="label-quiet">Total à encaisser</p><p className="num mt-2 text-2xl font-semibold">{formatCurrency(totals.total, currency)}</p></div>
          <div className="p-5"><p className="label-quiet">Dont en retard</p><p className="num mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">{formatCurrency(totals.overdueTotal, currency)}</p></div>
          <div className="p-5"><p className="label-quiet">Factures concernées</p><p className="num mt-2 text-2xl font-semibold">{filtered.length}</p></div>
        </Card>

        <Card>
          <div className="border-b border-gray-200 p-3 dark:border-gray-800">
            <Tabs active={filter} onChange={(k) => setFilter(k as typeof filter)} tabs={filters.map((f) => ({ key: f.key, label: f.label, count: f.count }))} />
          </div>
          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={AlertCircle} title="Aucune facture impayée" description="Toutes les factures sont réglées" />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              rowKey={(i) => i.id}
              onRowClick={(i) => navigate(`/invoices/${i.id}`)}
              defaultSort={{ key: 'dueDate', dir: 'asc' }}
            />
          )}
        </Card>
      </PageContent>
    </div>
  );
}