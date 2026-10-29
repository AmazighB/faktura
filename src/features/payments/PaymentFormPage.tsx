import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { computeTotals } from '@/utils/calc';
import { formatCurrency, toISODate } from '@/utils/format';
import { paymentMethodLabels } from '@/utils/labels';
import { cn } from '@/utils/cn';
import type { PaymentMethod } from '@/types';
import { amountDue } from '@/utils/invoice';

export default function PaymentFormPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoiceId ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate());
  const [method, setMethod] = useState<PaymentMethod>('especes');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: invoices } = useAsync(() => services.invoices.list(), []);
  const { data: clients } = useAsync(() => services.clients.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);

  const payableInvoices = (invoices ?? []).filter(
    (i) => i.status === 'emise' || i.status === 'partielle' || i.status === 'retard',
  );

  const selectedInvoice = (invoices ?? []).find((i) => i.id === selectedInvoiceId);
  const selectedClient = selectedInvoice
    ? (clients ?? []).find((c) => c.id === selectedInvoice.clientId)
    : null;
  const remaining = selectedInvoice
    ? amountDue(selectedInvoice)
    : 0;

  useEffect(() => {
    if (remaining > 0 && !amount) setAmount(String(remaining));
  }, [remaining, amount]);

  const paymentDateError = (() => {
    if (!selectedInvoice || !date) return null;
    if (date > toISODate()) return "La date de paiement ne peut pas être dans le futur";
    if (date < selectedInvoice.date) return "La date de paiement ne peut pas être antérieure à la date de facture";
    return null;
  })();

  const handleSave = async () => {
    const amt = Number(amount);
    if (!selectedInvoiceId) { push('error', 'Sélectionnez une facture'); return; }
    if (!amt || amt <= 0) { push('error', 'Montant invalide'); return; }
    if (amt > remaining + 0.001) { push('error', 'Montant supérieur au reste à payer'); return; }
    if (paymentDateError) { push('error', paymentDateError); return; }
    setSaving(true);
    try {
      const inv = (invoices ?? []).find((i) => i.id === selectedInvoiceId)!;
      const allPayments = await services.payments.list();
      const year = new Date().getFullYear();
      const seq = String(allPayments.length + 1).padStart(4, '0');
      const paymentNumber = `PAY-${year}-${seq}`;
      await services.payments.create({
        number: paymentNumber,
        invoiceId: selectedInvoiceId,
        clientId: inv.clientId,
        amount: amt,
        date,
        method,
        reference,
        note,
      });
      services.activityLogs.log({
        userId: 'u1', userName: 'Administrateur',
        action: 'a enregistré un paiement de', entity: 'Paiement', details: formatCurrency(amt, settings?.currency ?? 'DA'),
      });
      push('success', 'Paiement enregistré');
      navigate(`/invoices/${selectedInvoiceId}`);
    } catch {
      push('error', 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const currency = settings?.currency ?? 'DA';
  const amt = Number(amount) || 0;
  const tooHigh = !!selectedInvoice && amt > remaining + 0.001;
  const after = Math.max(remaining - amt, 0);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); void handleSave(); }
  };

  return (
    <PageContent className="pt-6" >
      <div className="mx-auto max-w-xl" onKeyDown={onKey}>
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </button>
        <h1 className="text-[26px] font-semibold leading-tight">Enregistrer un paiement</h1>
        <p className="mt-1 text-sm text-gray-500">Le statut de la facture est mis à jour automatiquement.</p>

        <Card className="mt-6">
          <div className="space-y-5 p-5">
            <Field label="Facture" required>
              <Select value={selectedInvoiceId} onChange={(e) => { setSelectedInvoiceId(e.target.value); setAmount(''); }}>
                <option value="">Choisir une facture à encaisser…</option>
                {payableInvoices.map((inv) => {
                  const client = (clients ?? []).find((c) => c.id === inv.clientId);
                  const rem = amountDue(inv);
                  return <option key={inv.id} value={inv.id}>{inv.number} · {client?.name} · reste {formatCurrency(rem, currency)}</option>;
                })}
              </Select>
            </Field>

            {selectedInvoice && (
              <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedClient?.name ?? '—'}</p>
                  <p className="num text-xs text-gray-500"><span className="font-mono">{selectedInvoice.number}</span> · total {formatCurrency(computeTotals(selectedInvoice.items).totalTTC, currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Reste à payer</p>
                  <p className="num text-base font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(remaining, currency)}</p>
                </div>
              </div>
            )}

            <Field label="Montant reçu" required>
              <div className="space-y-2">
                <div className="relative">
                  <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus={!!invoiceId}
                    className={cn('num h-12 pr-14 text-lg font-semibold', tooHigh && 'border-red-400 focus:border-red-500 focus:ring-red-500/20')} />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">{currency}</span>
                </div>
                {selectedInvoice && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setAmount(String(remaining))}>Solde complet</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setAmount(String(Math.round(remaining / 2)))}>50 %</Button>
                    <span className={cn('num ml-auto text-xs', tooHigh ? 'font-medium text-red-600' : 'text-gray-500')}>
                      {tooHigh ? 'Supérieur au reste à payer' : after === 0 ? 'La facture sera soldée' : `Reste ensuite ${formatCurrency(after, currency)}`}
                    </span>
                  </div>
                )}
              </div>
            </Field>

            <div>
              <p className="mb-1.5 text-[13px] font-medium text-gray-700 dark:text-gray-300">Mode de paiement</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Mode de paiement">
                {Object.entries(paymentMethodLabels).map(([key, label]) => (
                  <button key={key} type="button" role="radio" aria-checked={method === key} onClick={() => setMethod(key as PaymentMethod)}
                    className={cn('rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors',
                      method === key ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className={cn(paymentDateError && 'border-red-400 focus:border-red-500 focus:ring-red-500/20')} /></Field>
              <Field label="Référence"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° chèque, virement…" /></Field>
            </div>
            <Field label="Note"><Textarea className="min-h-[56px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facultatif" /></Field>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
            <span className="hidden text-xs text-gray-400 sm:block"><span className="kbd">Entrée</span> pour valider</span>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={() => navigate(-1)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving || !selectedInvoiceId || amt <= 0 || tooHigh || !!paymentDateError}>
                <Save className="h-4 w-4" />{saving ? 'Enregistrement…' : amt > 0 ? `Encaisser ${formatCurrency(amt, currency)}` : 'Encaisser'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageContent>
  );
}