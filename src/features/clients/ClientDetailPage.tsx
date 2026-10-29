import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Plus, FileText, Receipt, CreditCard, Phone, Mail, Building2, Archive, ArchiveRestore } from 'lucide-react';
import { PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingOverlay } from '@/components/feedback/Loading';
import { ErrorState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { InvoiceStatusBadge, QuoteStatusBadge } from '@/components/ui/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { formatCurrency, formatDate, formatRelative } from '@/utils/format';
import { computeTotals } from '@/utils/calc';
import { clientTypeLabels, paymentMethodLabels } from '@/utils/labels';
import type { Invoice, Payment, Quote } from '@/types';
import { amountDue } from '@/utils/invoice';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('invoices');

  const { data: client, loading, error, reload } = useAsync(() => services.clients.get(id!), [id]);
  const { data: invoices } = useAsync(() => services.invoices.list(), []);
  const { data: quotes } = useAsync(() => services.quotes.list(), []);
  const { data: payments } = useAsync(() => services.payments.list(), []);

  const clientInvoices = (invoices ?? []).filter((i) => i.clientId === id);
  const clientQuotes = (quotes ?? []).filter((q) => q.clientId === id);
  const clientPayments = (payments ?? []).filter((p) => p.clientId === id);

  const totals = useMemo(() => {
    const issued = clientInvoices.filter((i) => i.status !== 'brouillon' && i.status !== 'annulee');
    const totalBilled = issued.reduce((s, i) => s + computeTotals(i.items).totalTTC, 0);
    const totalPaid = issued.reduce((s, i) => s + i.paidAmount, 0);
    return { totalBilled, totalPaid, balance: issued.reduce((s, i) => s + amountDue(i), 0) };
  }, [clientInvoices]);

  const invoiceColumns: Column<Invoice>[] = [
    { key: 'number', header: 'Numéro', render: (i) => <span className="font-mono text-[13px] font-medium">{i.number}</span> },
    { key: 'date', header: 'Date', render: (i) => formatDate(i.date) },
    { key: 'dueDate', header: 'Échéance', render: (i) => formatDate(i.dueDate) },
    { key: 'total', header: 'Total', align: 'right', render: (i) => formatCurrency(computeTotals(i.items).totalTTC) },
    { key: 'paid', header: 'Payé', align: 'right', render: (i) => formatCurrency(i.paidAmount) },
    { key: 'status', header: 'Statut', render: (i) => <InvoiceStatusBadge status={i.status} /> },
  ];

  const quoteColumns: Column<Quote>[] = [
    { key: 'number', header: 'Numéro', render: (q) => <span className="font-medium">{q.number}</span> },
    { key: 'date', header: 'Date', render: (q) => formatDate(q.date) },
    { key: 'expiryDate', header: 'Expiration', render: (q) => formatDate(q.expiryDate) },
    { key: 'total', header: 'Total', align: 'right', render: (q) => formatCurrency(computeTotals(q.items).totalTTC) },
    { key: 'status', header: 'Statut', render: (q) => <QuoteStatusBadge status={q.status} /> },
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: 'number', header: 'Numéro', render: (p) => <span className="font-medium">{p.number}</span> },
    { key: 'date', header: 'Date', render: (p) => formatDate(p.date) },
    { key: 'amount', header: 'Montant', align: 'right', render: (p) => <span className="font-medium">{formatCurrency(p.amount)}</span> },
    { key: 'method', header: 'Mode', render: (p) => <span className="text-gray-600">{paymentMethodLabels[p.method]}</span> },
  ];

  if (loading) return <LoadingOverlay message="Chargement du client..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!client) return <ErrorState message="Client introuvable" />;

  const lateCount = clientInvoices.filter((i) => i.status === 'retard').length;
  const fiscal = ([['NIF', client.nif], ['NIS', client.nis], ['RC', client.rc], ['AI', client.ai]] as [string, string | undefined][]).filter(([, v]) => v);
  const contact = [
    { icon: Phone, value: client.phone },
    { icon: Mail, value: client.email },
    { icon: Building2, value: [client.address, [client.commune, client.wilaya].filter(Boolean).join(', ')].filter(Boolean).join(' — ') },
  ].filter((c) => c.value);

  return (
    <PageContent className="pt-6">
      <button onClick={() => navigate('/clients')} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
        <ArrowLeft className="h-3.5 w-3.5" /> Clients
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-lg font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-semibold leading-tight">{client.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{clientTypeLabels[client.type]}</Badge>
              {client.archived && <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Archivé</Badge>}
              Dernière activité {formatRelative(client.lastActivityAt).toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/clients/${client.id}/edit`)}><Edit3 className="h-4 w-4" />Modifier</Button>
          <Button variant="outline" size="sm" onClick={async () => { await services.clients.update(client.id, { archived: !client.archived }); reload(); }}>
            {client.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{client.archived ? 'Restaurer' : 'Archiver'}
          </Button>
          <Button variant="outline" size="sm" disabled={client.archived} onClick={() => navigate(`/quotes/new?client=${client.id}`)}><FileText className="h-4 w-4" />Nouveau devis</Button>
          <Button size="sm" disabled={client.archived} onClick={() => navigate(`/invoices/new?client=${client.id}`)}><Plus className="h-4 w-4" />Nouvelle facture</Button>
        </div>
      </div>

      {/* Le solde d'abord : c'est la question que l'on se pose en ouvrant une fiche client */}
      <Card className="mt-6 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden dark:divide-gray-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <p className="label-quiet">Solde restant</p>
          <p className={'num mt-2 text-[26px] font-semibold leading-none ' + (totals.balance > 0 ? 'text-amber-600 dark:text-amber-400' : '')}>{formatCurrency(totals.balance)}</p>
          {lateCount > 0 && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{lateCount} facture{lateCount > 1 ? 's' : ''} en retard</p>}
        </div>
        <div className="p-5"><p className="label-quiet">Total facturé</p><p className="num mt-2 text-[26px] font-semibold leading-none">{formatCurrency(totals.totalBilled)}</p></div>
        <div className="p-5"><p className="label-quiet">Total encaissé</p><p className="num mt-2 text-[26px] font-semibold leading-none text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.totalPaid)}</p></div>
      </Card>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
        {/* Historique : le cœur de la fiche */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="p-3">
            <Tabs
              tabs={[
                { key: 'invoices', label: 'Factures', count: clientInvoices.length },
                { key: 'quotes', label: 'Devis', count: clientQuotes.length },
                { key: 'payments', label: 'Paiements', count: clientPayments.length },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>
          {tab === 'invoices' && (
            clientInvoices.length === 0 ? (
              <EmptyState icon={Receipt} title="Aucune facture" description="Créez la première facture de ce client." action={<Button size="sm" disabled={client.archived} onClick={() => navigate(`/invoices/new?client=${client.id}`)}><Plus className="h-4 w-4" />Nouvelle facture</Button>} />
            ) : (
              <DataTable columns={invoiceColumns} data={clientInvoices} rowKey={(i) => i.id} onRowClick={(i) => navigate(`/invoices/${i.id}`)} defaultSort={{ key: 'date', dir: 'desc' }} />
            )
          )}
          {tab === 'quotes' && (
            clientQuotes.length === 0 ? (
              <EmptyState icon={FileText} title="Aucun devis" description="Les devis de ce client apparaîtront ici." />
            ) : (
              <DataTable columns={quoteColumns} data={clientQuotes} rowKey={(q) => q.id} onRowClick={(q) => navigate(`/quotes/${q.id}`)} />
            )
          )}
          {tab === 'payments' && (
            clientPayments.length === 0 ? (
              <EmptyState icon={CreditCard} title="Aucun paiement" description="Les paiements reçus de ce client apparaîtront ici." />
            ) : (
              <DataTable columns={paymentColumns} data={clientPayments} rowKey={(p) => p.id} />
            )
          )}
        </Card>

        {/* Coordonnées : un seul bloc, uniquement ce qui est renseigné */}
        <Card>
          <div className="space-y-5 p-5 text-sm">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Coordonnées</h3>
              {contact.length === 0 ? <p className="text-gray-400">Aucune coordonnée renseignée.</p> : (
                <ul className="space-y-2.5">
                  {contact.map((c, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-gray-700 dark:text-gray-300">
                      <c.icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <span className="break-words">{c.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {fiscal.length > 0 && (
              <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                <h3 className="mb-3 text-sm font-semibold">Identifiants fiscaux</h3>
                <dl className="space-y-1.5">
                  {fiscal.map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-3"><dt className="text-gray-500">{l}</dt><dd className="num font-mono text-[13px] text-gray-800 dark:text-gray-200">{v}</dd></div>
                  ))}
                </dl>
              </div>
            )}
            {(client.paymentConditions || client.defaultDiscount || client.notes) && (
              <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                <h3 className="mb-3 text-sm font-semibold">Conditions</h3>
                <dl className="space-y-1.5">
                  {client.paymentConditions && <div className="flex justify-between gap-3"><dt className="text-gray-500">Paiement</dt><dd>{client.paymentConditions}</dd></div>}
                  {!!client.defaultDiscount && <div className="flex justify-between gap-3"><dt className="text-gray-500">Remise par défaut</dt><dd className="num">{client.defaultDiscount} %</dd></div>}
                </dl>
                {client.notes && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400">{client.notes}</p>}
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageContent>
  );
}