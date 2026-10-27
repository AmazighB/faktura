import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import { computeTotals } from '@/utils/calc';
import { formatCurrency, toISODate } from '@/utils/format';
import { paymentMethodLabels, invoiceStatusLabels } from '@/utils/labels';
import { InvoiceStatusBadge } from '@/components/ui/StatusBadge';
import type { PaymentMethod } from '@/types';

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
    ? computeTotals(selectedInvoice.items).totalTTC - selectedInvoice.paidAmount
    : 0;

  useEffect(() => {
    if (remaining > 0 && !amount) setAmount(String(remaining));
  }, [remaining, amount]);

  const handleSave = async () => {
    const amt = Number(amount);
    if (!selectedInvoiceId) { push('error', 'Sélectionnez une facture'); return; }
    if (!amt || amt <= 0) { push('error', 'Montant invalide'); return; }
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
      const newPaid = inv.paidAmount + amt;
      const total = computeTotals(inv.items).totalTTC;
      const newStatus = newPaid >= total ? 'payee' : 'partielle';
      await services.invoices.update(selectedInvoiceId, { paidAmount: newPaid, status: newStatus as never });
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

  return (
    <div>
      <PageHeader
        title="Nouveau paiement"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Retour</Button>
            <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        }
      />
      <PageContent>
        <div className="max-w-2xl">
          <Card>
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold">Informations du paiement</h3>
            </div>
            <div className="space-y-4 p-5">
              <Field label="Facture" required>
                <Select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)}>
                  <option value="">— Sélectionner une facture —</option>
                  {payableInvoices.map((inv) => {
                    const client = (clients ?? []).find((c) => c.id === inv.clientId);
                    const rem = computeTotals(inv.items).totalTTC - inv.paidAmount;
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.number} — {client?.name} — Reste: {formatCurrency(rem, settings?.currency ?? 'DA')}
                      </option>
                    );
                  })}
                </Select>
              </Field>

              {selectedInvoice && (
                <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{selectedInvoice.number}</span>
                    <InvoiceStatusBadge status={selectedInvoice.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Client</p>
                      <p className="font-medium">{selectedClient?.name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="font-medium">{formatCurrency(computeTotals(selectedInvoice.items).totalTTC, settings?.currency ?? 'DA')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Reste à payer</p>
                      <p className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(remaining, settings?.currency ?? 'DA')}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Montant" required>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
                </Field>
                <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              </div>
              <Field label="Mode de paiement">
                <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {Object.entries(paymentMethodLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Référence"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° chèque, virement..." /></Field>
              <Field label="Note"><Textarea className="min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            </div>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}
