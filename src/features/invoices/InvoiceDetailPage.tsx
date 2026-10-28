import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Printer, Copy, CreditCard, FileX, MoreHorizontal, Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { InvoiceStatusBadge } from '@/components/ui/StatusBadge';
import { LoadingOverlay } from '@/components/feedback/Loading';
import { ErrorState } from '@/components/feedback/EmptyState';
import { Dialog } from '@/components/ui/Dialog';
import { Tooltip } from '@/components/ui/Tooltip';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { computeTotals } from '@/utils/calc';
import { formatCurrency, formatDate, toISODate } from '@/utils/format';
import { invoiceStatusLabels, paymentMethodLabels } from '@/utils/labels';
import type { InvoiceStatus, PaymentMethod } from '@/types';

import { printElement } from '@/utils/print';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const confirm = useConfirm();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: invoice, loading, error, reload } = useAsync(() => services.invoices.get(id!), [id]);
  const { data: client } = useAsync(async () => (invoice ? services.clients.get(invoice.clientId) : Promise.resolve(null)), [invoice]);
  const { data: settings } = useAsync(() => services.settings.get(), []);
  const { data: payments, reload: reloadPayments } = useAsync(() => (id ? services.payments.getByInvoice(id) : Promise.resolve([])), [id]);

  const totals = useMemo(() => (invoice ? computeTotals(invoice.items) : null), [invoice]);
  const remaining = totals ? totals.totalTTC - (invoice?.paidAmount ?? 0) : 0;

  if (loading) return <LoadingOverlay message="Chargement de la facture..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!invoice) return <ErrorState message="Facture introuvable" />;

  const canPay = invoice.status === 'emise' || invoice.status === 'partielle' || invoice.status === 'retard';

  const handlePayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      push('error', 'Montant invalide');
      return;
    }
    setSavingPayment(true);
    try {
      const allPayments = await services.payments.list();
      const year = new Date().getFullYear();
      const seq = String(allPayments.length + 1).padStart(4, '0');
      const paymentNumber = `PAY-${year}-${seq}`;
      await services.payments.create({
        number: paymentNumber,
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        amount,
        date: toISODate(),
        method: paymentMethod,
        reference: paymentRef,
        note: paymentNote,
      });
      const newPaid = invoice.paidAmount + amount;
      const newStatus: InvoiceStatus = newPaid >= totals!.totalTTC ? 'payee' : 'partielle';
      await services.invoices.update(invoice.id, { paidAmount: newPaid, status: newStatus });
      services.activityLogs.log({
        userId: 'u1', userName: 'Administrateur',
        action: 'a enregistré un paiement de', entity: 'Paiement', details: formatCurrency(amount, settings?.currency ?? 'DA'),
      });
      push('success', 'Paiement enregistré');
      setPaymentOpen(false);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNote('');
      reload();
      reloadPayments();
    } catch {
      push('error', 'Erreur');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Annuler la facture',
      message: `Annuler la facture ${invoice.number} ? Cette action est irréversible.`,
      confirmLabel: 'Annuler la facture',
      variant: 'danger',
    });
    if (ok) {
      await services.invoices.update(invoice.id, { status: 'annulee' });
      push('success', 'Facture annulée');
      reload();
    }
  };

  const handleDuplicate = async () => {
    const copy = await services.invoices.duplicate(invoice.id);
    push('success', 'Facture dupliquée', copy.number);
    navigate(`/invoices/${copy.id}`);
  };

  const handleCreateCreditNote = async () => {
    const ok = await confirm({
      title: 'Créer un avoir',
      message: `Créer un avoir à partir de la facture ${invoice.number} ?`,
      confirmLabel: 'Créer',
    });
    if (ok) {
      const cn = await services.invoices.createCreditNote(invoice.id);
      push('success', 'Avoir créé', cn.number);
    }
  };

  const money = (v: number) => formatCurrency(v, settings?.currency ?? 'DA');
  const total = totals!.totalTTC;
  const paidPct = total > 0 ? Math.min((invoice.paidAmount / total) * 100, 100) : 0;
  const isDraft = invoice.status === 'brouillon';
  const canCancel = invoice.status !== 'brouillon' && invoice.status !== 'annulee';
  const openPayment = () => { setPaymentAmount(String(remaining)); setPaymentOpen(true); };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex min-w-0 items-center gap-3">
          <Tooltip label="Retour aux factures" side="right">
            <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')} aria-label="Retour aux factures">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Tooltip>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-base font-semibold">{invoice.number}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="truncate text-[13px] text-gray-500">{client?.name} · échéance {formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => printElement('document-preview', invoice.number)}><Printer className="h-4 w-4" />Imprimer</Button>
          {canPay ? (
            <Button size="sm" onClick={openPayment}><CreditCard className="h-4 w-4" />Enregistrer un paiement</Button>
          ) : (
            <Button size="sm" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}><Edit3 className="h-4 w-4" />{isDraft ? 'Terminer la facture' : 'Modifier'}</Button>
          )}
          <div className="relative" onKeyDown={(e) => { if (e.key === 'Escape') setMoreOpen(false); }}>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMoreOpen((v) => !v)} aria-label="Plus d'actions" aria-haspopup="menu" aria-expanded={moreOpen}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                <div role="menu" className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-pop animate-slide-up dark:border-gray-800 dark:bg-gray-900">
                  {canPay && <button role="menuitem" onClick={() => { setMoreOpen(false); navigate(`/invoices/${invoice.id}/edit`); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"><Edit3 className="h-4 w-4 text-gray-400" />Modifier</button>}
                  <button role="menuitem" onClick={() => { setMoreOpen(false); void handleDuplicate(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"><Copy className="h-4 w-4 text-gray-400" />Dupliquer</button>
                  {!isDraft && <button role="menuitem" onClick={() => { setMoreOpen(false); void handleCreateCreditNote(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"><FileX className="h-4 w-4 text-gray-400" />Créer un avoir</button>}
                  {canCancel && (
                    <>
                      <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
                      <button role="menuitem" onClick={() => { setMoreOpen(false); void handleCancel(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Ban className="h-4 w-4" />Annuler la facture</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Situation de paiement : total, payé, reste, avancement */}
      {!isDraft && (
        <div className="border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <div className="flex flex-wrap gap-x-8 gap-y-1">
              <div><p className="label-quiet">Total TTC</p><p className="num text-sm font-semibold">{money(total)}</p></div>
              <div><p className="label-quiet">Payé</p><p className="num text-sm font-semibold text-emerald-600 dark:text-emerald-400">{money(invoice.paidAmount)}</p></div>
              <div><p className="label-quiet">Reste à payer</p><p className={'num text-sm font-semibold ' + (remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400')}>{money(remaining)}</p></div>
            </div>
            <p className="num text-xs text-gray-500">{Math.round(paidPct)} % réglé</p>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" role="progressbar" aria-valuenow={Math.round(paidPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du paiement">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: paidPct + '%' }} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin bg-gray-100 p-4 dark:bg-gray-950 sm:p-8">
        <div className="mx-auto max-w-[800px] space-y-5">
          <DocumentPreview
            type="facture"
            number={invoice.number}
            date={invoice.date}
            dueDateOrExpiry={invoice.dueDate}
            client={client}
            items={invoice.items}
            notes={invoice.notes}
            conditions={invoice.conditions}
            company={settings?.company ?? ({} as never)}
            currency={settings?.currency ?? 'DA'}
            paidAmount={invoice.paidAmount}
          />

          {/* Payment history */}
          {(payments?.length ?? 0) > 0 && (
            <Card>
              <div className="px-5 pt-4">
                <h3 className="text-sm font-semibold">Paiements reçus</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {payments?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="num text-sm font-medium">{formatCurrency(p.amount, settings?.currency ?? 'DA')}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.date)} · {paymentMethodLabels[p.method]}{p.reference ? ` · ${p.reference}` : ''}</p>
                    </div>
                    <span className="font-mono text-xs text-gray-400">{p.number}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Payment dialog */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Enregistrer un paiement" size="sm" footer={<><Button variant="outline" onClick={() => setPaymentOpen(false)}>Annuler</Button>
            <Button onClick={handlePayment} disabled={savingPayment}>{savingPayment ? 'Enregistrement...' : 'Enregistrer'}</Button></>}>
        <div className="space-y-4 p-5">
          <div className="rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800/50">
            <div className="flex justify-between"><span className="text-gray-500">Facture</span><span className="font-medium">{invoice.number}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Reste à payer</span><span className="font-semibold text-amber-600">{formatCurrency(remaining, settings?.currency ?? 'DA')}</span></div>
          </div>
          <Field label="Montant" required>
            <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} autoFocus />
          </Field>
          <Field label="Mode de paiement">
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {Object.entries(paymentMethodLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Référence"><Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="N° chèque, virement..." /></Field>
          <Field label="Note"><Textarea className="min-h-[50px]" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} /></Field>
        </div>
      </Dialog>
    </div>
  );
}