import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, CheckCircle2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { CreditNoteStatusBadge } from '@/components/ui/StatusBadge';
import { LoadingOverlay } from '@/components/feedback/Loading';
import { ErrorState } from '@/components/feedback/EmptyState';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { useConfirm } from '@/app/providers/ConfirmContext';
import { computeTotals } from '@/utils/calc';
import { formatCurrency } from '@/utils/format';
import type { CompanyInfo } from '@/types';

import { printElement } from '@/utils/print';

export default function CreditNoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const confirm = useConfirm();

  const { data: creditNote, loading, error, reload } = useAsync(() => services.creditNotes.get(id!), [id]);
  const { data: client } = useAsync(async () => (creditNote ? services.clients.get(creditNote.clientId) : Promise.resolve(null)), [creditNote]);
  const { data: settings } = useAsync(() => services.settings.get(), []);

  const totals = useMemo(() => (creditNote ? computeTotals(creditNote.items) : null), [creditNote]);

  if (loading) return <LoadingOverlay message="Chargement de l'avoir..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!creditNote) return <ErrorState message="Avoir introuvable" />;

  const handleApply = async () => {
    const ok = await confirm({
      title: 'Appliquer l\'avoir',
      message: `Appliquer l'avoir ${creditNote.number} à la facture ${creditNote.invoiceNumber} ? Le montant de ${formatCurrency(totals!.totalTTC, settings?.currency ?? 'DA')} sera déduit.`,
      confirmLabel: 'Appliquer',
    });
    if (ok) {
      await services.creditNotes.apply(creditNote.id);
      push('success', 'Avoir appliqué', creditNote.number);
      reload();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Tooltip label="Retour" side="right">
            <Button variant="ghost" size="icon" onClick={() => navigate('/credit-notes')} aria-label="Retour">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Tooltip>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-semibold">{creditNote.number}</h1>
              <CreditNoteStatusBadge status={creditNote.status} />
            </div>
            <p className="text-[13px] text-gray-500">{client?.name} · sur la facture <span className="font-mono">{creditNote.invoiceNumber}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => printElement('document-preview', creditNote.number)}><Printer className="h-4 w-4" /> Imprimer</Button>
          {creditNote.status === 'brouillon' && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/credit-notes/${creditNote.id}/edit`)}><Pencil className="h-4 w-4" /> Modifier</Button>
          )}
          {creditNote.status === 'emis' && (
            <Button size="sm" onClick={handleApply}><CheckCircle2 className="h-4 w-4" /> Appliquer</Button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-gray-200 bg-gray-50 px-5 py-2.5 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Montant TTC:</span>
          <span className="num font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(totals!.totalTTC, settings?.currency ?? 'DA')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Motif:</span>
          <span className="font-medium">{creditNote.reason}</span>
        </div>
        {creditNote.status === 'applique' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Appliqué:</span>
            <span className="num font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(creditNote.appliedAmount, settings?.currency ?? 'DA')}</span>
          </div>
        )}
      </div>

      {/* Document preview */}
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-gray-100 p-4 dark:bg-gray-950 sm:p-8">
        <div className="mx-auto max-w-[800px]">
          <DocumentPreview
            type="avoir"
            number={creditNote.number}
            date={creditNote.date}
            dueDateOrExpiry={creditNote.date}
            client={client}
            items={creditNote.items}
            notes={creditNote.notes}
            conditions={creditNote.reason}
            company={settings?.company ?? ({} as CompanyInfo)}
            currency={settings?.currency ?? 'DA'}
            template={settings?.invoiceTemplate}
          />
        </div>
      </div>
    </div>
  );
}