import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Printer, FileCheck2, Send, MoreHorizontal, Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { QuoteStatusBadge } from '@/components/ui/StatusBadge';
import { LoadingOverlay } from '@/components/feedback/Loading';
import { ErrorState } from '@/components/feedback/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { computeTotals } from '@/utils/calc';
import { formatCurrency, formatDate } from '@/utils/format';
import { quoteStatusLabels } from '@/utils/labels';

import { printElement } from '@/utils/print';

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const confirm = useConfirm();
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: quote, loading, error, reload } = useAsync(() => services.quotes.get(id!), [id]);
  const { data: client } = useAsync(async () => (quote ? services.clients.get(quote.clientId) : Promise.resolve(null)), [quote]);
  const { data: settings } = useAsync(() => services.settings.get(), []);

  if (loading) return <LoadingOverlay message="Chargement du devis..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!quote) return <ErrorState message="Devis introuvable" />;

  const totals = computeTotals(quote.items);

  const handleConvert = async () => {
    const ok = await confirm({
      title: 'Convertir en facture',
      message: `Convertir le devis ${quote.number} en facture ?`,
      confirmLabel: 'Convertir',
    });
    if (ok) {
      const invoice = await services.quotes.convertToInvoice(quote.id);
      push('success', 'Devis converti en facture', invoice.number);
      navigate(`/invoices/${invoice.id}`);
    }
  };

  const handleStatusChange = async (status: typeof quote.status) => {
    await services.quotes.update(quote.id, { status });
    push('success', 'Statut modifié');
    reload();
  };

  const st = quote.status;
  // Prochaine étape logique : une seule action mise en avant
  const next =
    st === 'accepte' ? { label: 'Convertir en facture', icon: FileCheck2, run: handleConvert }
    : st === 'brouillon' ? { label: 'Marquer comme envoyé', icon: Send, run: () => handleStatusChange('envoye') }
    : st === 'envoye' || st === 'attente' ? { label: 'Marquer comme accepté', icon: Check, run: () => handleStatusChange('accepte') }
    : null;
  const hint =
    st === 'accepte' ? 'Le client a accepté ce devis. Convertissez-le en facture en un clic.'
    : st === 'brouillon' ? 'Ce devis est un brouillon. Relisez-le puis marquez-le comme envoyé.'
    : st === 'envoye' || st === 'attente' ? `En attente de réponse du client. Valable jusqu'au ${formatDate(quote.expiryDate)}.`
    : st === 'refuse' ? 'Le client a refusé ce devis.' : st === 'expire' ? `Ce devis a expiré le ${formatDate(quote.expiryDate)}.` : '';
  const statuses = ['brouillon', 'envoye', 'attente', 'accepte', 'refuse', 'expire'] as const;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex min-w-0 items-center gap-3">
          <Tooltip label="Retour aux devis" side="right">
            <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')} aria-label="Retour aux devis">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Tooltip>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-base font-semibold">{quote.number}</h1>
              <QuoteStatusBadge status={st} />
            </div>
            <p className="truncate text-[13px] text-gray-500">{client?.name} · <span className="num">{formatCurrency(totals.totalTTC, settings?.currency ?? 'DA')}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => printElement('document-preview', quote.number)}><Printer className="h-4 w-4" />Imprimer</Button>
          {next ? (
            <Button size="sm" onClick={next.run}><next.icon className="h-4 w-4" />{next.label}</Button>
          ) : (
            <Button size="sm" onClick={() => navigate(`/quotes/${quote.id}/edit`)}><Edit3 className="h-4 w-4" />Modifier</Button>
          )}
          <div className="relative">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMoreOpen((v) => !v)} aria-label="Plus d'actions" aria-haspopup="menu" aria-expanded={moreOpen}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                <div role="menu" className="absolute right-0 z-20 mt-1 w-60 rounded-xl border border-gray-200 bg-white p-1 shadow-pop animate-slide-up dark:border-gray-800 dark:bg-gray-900">
                  {next && <button role="menuitem" onClick={() => { setMoreOpen(false); navigate(`/quotes/${quote.id}/edit`); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"><Edit3 className="h-4 w-4 text-gray-400" />Modifier</button>}
                  <p className="px-3 pb-1 pt-2 text-xs font-medium text-gray-400">Changer le statut</p>
                  {statuses.map((x) => (
                    <button key={x} role="menuitemradio" aria-checked={st === x} onClick={() => { setMoreOpen(false); if (x !== st) void handleStatusChange(x); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                      {st === x ? <Check className="h-4 w-4 text-accent-600" /> : <Circle className="h-4 w-4 text-gray-300" />}
                      {quoteStatusLabels[x]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {hint && <p className="border-b border-gray-200 bg-gray-50 px-5 py-2.5 text-[13px] text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">{hint}</p>}

      <div className="flex-1 overflow-y-auto scrollbar-thin bg-gray-100 p-4 dark:bg-gray-950 sm:p-8">
        <div className="mx-auto max-w-[800px]">
          <DocumentPreview
            type="devis"
            number={quote.number}
            date={quote.date}
            dueDateOrExpiry={quote.expiryDate}
            client={client}
            items={quote.items}
            notes={quote.notes}
            conditions={quote.conditions}
            company={settings?.company ?? ({} as never)}
            currency={settings?.currency ?? 'DA'}
          />
        </div>
      </div>
    </div>
  );
}