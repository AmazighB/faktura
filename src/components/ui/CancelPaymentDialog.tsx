import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/utils/format';
import { CANCEL_REASON_SUGGESTIONS, MIN_CANCEL_REASON_LENGTH } from '@/utils/payment';
import type { Payment } from '@/types';

interface CancelPaymentDialogProps {
  payment: Payment | null;
  currency: string;
  onClose: () => void;
  onConfirm: (payment: Payment, reason: string) => Promise<void>;
}

/** Annulation d'un paiement : le motif est obligatoire, le paiement reste dans l'historique. */
export function CancelPaymentDialog({ payment, currency, onClose, onConfirm }: CancelPaymentDialogProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payment) setReason('');
  }, [payment]);

  const valid = reason.trim().length >= MIN_CANCEL_REASON_LENGTH;

  const submit = async () => {
    if (!payment || !valid || saving) return;
    setSaving(true);
    try {
      await onConfirm(payment, reason.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!payment}
      onClose={onClose}
      title={payment ? `Annuler le paiement ${payment.number}` : 'Annuler le paiement'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Retour</Button>
          <Button variant="danger" onClick={submit} disabled={!valid || saving}>
            {saving ? 'Annulation…' : 'Annuler le paiement'}
          </Button>
        </>
      }
    >
      {payment && (
        <div className="space-y-4 p-5">
          <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
            Paiement de <span className="num font-semibold">{formatCurrency(payment.amount, currency)}</span> du {formatDate(payment.date)}.
            Il reste dans l'historique, barré, avec le motif. Le montant est retiré des totaux et le statut de la facture est mis à jour.
          </p>
          <Field label="Motif de l'annulation" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. chèque revenu impayé" autoFocus />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {CANCEL_REASON_SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setReason(s)} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}