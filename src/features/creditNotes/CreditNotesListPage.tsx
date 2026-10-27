import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileX, Eye, Trash2, CheckCircle2 } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { CreditNoteStatusBadge } from '@/components/ui/StatusBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { formatCurrency, formatDate } from '@/utils/format';
import { computeTotals } from '@/utils/calc';
import { creditNoteStatusLabels } from '@/utils/labels';
import type { CreditNote, CreditNoteStatus } from '@/types';

export default function CreditNotesListPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: creditNotes, loading, error, reload } = useAsync(() => services.creditNotes.list({ search }), [search]);
  const { data: clients } = useAsync(() => services.clients.list(), []);

  const clientName = (id: string) => (clients ?? []).find((c) => c.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    return (creditNotes ?? []).filter((cn) => statusFilter === 'all' || cn.status === statusFilter);
  }, [creditNotes, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cn of creditNotes ?? []) counts[cn.status] = (counts[cn.status] ?? 0) + 1;
    return counts;
  }, [creditNotes]);

  const handleApply = async (cn: CreditNote) => {
    const ok = await confirm({
      title: 'Appliquer l\'avoir',
      message: `Appliquer l'avoir ${cn.number} à la facture ${cn.invoiceNumber} ? Le montant sera déduit de la facture.`,
      confirmLabel: 'Appliquer',
    });
    if (ok) {
      await services.creditNotes.apply(cn.id);
      push('success', 'Avoir appliqué', cn.number);
      reload();
    }
  };

  const columns: Column<CreditNote>[] = [
    { key: 'number', header: 'Numéro', sortable: true, sortValue: (cn) => cn.number, render: (cn) => <span className="font-medium">{cn.number}</span> },
    { key: 'client', header: 'Client', render: (cn) => <span className="text-gray-700 dark:text-gray-300">{clientName(cn.clientId)}</span> },
    { key: 'invoice', header: 'Facture', render: (cn) => <span className="text-gray-600">{cn.invoiceNumber}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (cn) => cn.date, render: (cn) => formatDate(cn.date) },
    { key: 'reason', header: 'Motif', render: (cn) => <span className="text-gray-600 truncate">{cn.reason}</span> },
    { key: 'total', header: 'Montant TTC', align: 'right', sortable: true, sortValue: (cn) => computeTotals(cn.items).totalTTC, render: (cn) => <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(computeTotals(cn.items).totalTTC)}</span> },
    { key: 'status', header: 'Statut', render: (cn) => <CreditNoteStatusBadge status={cn.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (cn) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {cn.status === 'emis' && (
            <Tooltip label="Appliquer à la facture" side="top">
              <button onClick={() => handleApply(cn)} className="rounded p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" aria-label="Appliquer">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip label="Voir" side="top">
            <button onClick={() => navigate(`/credit-notes/${cn.id}`)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Voir">
              <Eye className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          {cn.status === 'brouillon' && (
            <Tooltip label="Supprimer" side="top">
              <button
                onClick={async () => {
                  const ok = await confirm({ title: 'Supprimer', message: `Supprimer l'avoir ${cn.number} ?`, confirmLabel: 'Supprimer', variant: 'danger' });
                  if (ok) { await services.creditNotes.remove(cn.id); push('success', 'Avoir supprimé'); reload(); }
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
        title="Avoirs"
        description={`${filtered.length} avoir(s)`}
        actions={<Button onClick={() => navigate('/credit-notes/new')}><Plus className="h-4 w-4" /> Nouvel avoir</Button>}
      />
      <PageContent>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-800">
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un avoir..." className="max-w-xs" />
            <Tabs active={statusFilter} onChange={setStatusFilter} tabs={['all', 'brouillon', 'emis', 'applique'].map((s) => ({ key: s, label: s === 'all' ? 'Tous' : creditNoteStatusLabels[s as CreditNoteStatus], count: s === 'all' ? undefined : (statusCounts[s] ?? 0) }))} />
          </div>
          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileX}
              title="Aucun avoir"
              description="Créez un avoir pour rembourser ou corriger une facture"
              action={<Button onClick={() => navigate('/credit-notes/new')}><Plus className="h-4 w-4" /> Nouvel avoir</Button>}
            />
          ) : (
            <DataTable columns={columns} data={filtered} rowKey={(cn) => cn.id} onRowClick={(cn) => navigate(`/credit-notes/${cn.id}`)} defaultSort={{ key: 'date', dir: 'desc' }} />
          )}
        </Card>
      </PageContent>
    </div>
  );
}