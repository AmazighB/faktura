import type { Payment } from '@/types';
import type { PaymentService, ListParams } from '@/services/types';
import { mockPayments } from '@/mocks/data';
import { delay, uid, matchesSearch, persistentStore } from '@/mocks/helpers';
import { invoiceService } from '@/mocks/invoiceService';
import { round2 } from '@/utils/calc';
import { amountDue } from '@/utils/invoice';
import { nextSequentialNumber } from '@/utils/numbering';
import { MIN_CANCEL_REASON_LENGTH, isActivePayment } from '@/utils/payment';

class MockPaymentService implements PaymentService {
  private paymentsStore = persistentStore<Payment>('payments', mockPayments);
  private get payments(): Payment[] { return this.paymentsStore.items; }
  private set payments(v: Payment[]) { this.paymentsStore.items = v; }

  private nextNumber(): string {
    return nextSequentialNumber(this.payments.map((p) => p.number), `PAY-${new Date().getFullYear()}-`, 4);
  }

  async list(params?: ListParams): Promise<Payment[]> {
    let result = this.payments;
    if (params?.search) {
      const s = params.search;
      result = result.filter((p) => matchesSearch(p.number, s) || matchesSearch(p.reference ?? '', s));
    }
    return delay([...result].sort((a, b) => b.date.localeCompare(a.date)));
  }

  async getByInvoice(invoiceId: string): Promise<Payment[]> {
    return delay(this.payments.filter((p) => p.invoiceId === invoiceId));
  }

  async create(data: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const invoice = invoiceService._internalGet(data.invoiceId);
    if (!invoice) throw new Error('Facture introuvable');
    if (invoice.status === 'brouillon') throw new Error('Émettez la facture avant d\'enregistrer un paiement.');
    if (invoice.status === 'annulee') throw new Error('Cette facture est annulée : aucun paiement possible.');

    const amount = round2(data.amount);
    if (!(amount > 0)) throw new Error('Le montant doit être supérieur à zéro.');
    const due = amountDue(invoice);
    if (amount > due) throw new Error(`Le montant dépasse le reste à payer (${due.toFixed(2)}).`);

    const taken = !data.number || this.payments.some((p) => p.number === data.number);
    const payment: Payment = {
      ...data,
      amount,
      number: taken ? this.nextNumber() : data.number,
      id: uid('pay'),
      createdAt: new Date().toISOString(),
    };
    this.payments.unshift(payment);
    invoiceService._internalUpdate(invoice.id, { paidAmount: round2(invoice.paidAmount + amount) });
    return delay(payment);
  }

  async cancel(id: string, reason: string): Promise<Payment> {
    const idx = this.payments.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Paiement introuvable');
    const payment = this.payments[idx];
    if (!isActivePayment(payment)) throw new Error('Ce paiement est déjà annulé.');
    const motif = reason.trim();
    if (motif.length < MIN_CANCEL_REASON_LENGTH) throw new Error('Indiquez le motif de l\'annulation.');

    const cancelled: Payment = { ...payment, status: 'annule', cancelledAt: new Date().toISOString(), cancelReason: motif };
    this.payments[idx] = cancelled;
    const invoice = invoiceService._internalGet(payment.invoiceId);
    if (invoice) invoiceService._internalUpdate(invoice.id, { paidAmount: round2(Math.max(0, invoice.paidAmount - payment.amount)) });
    return delay(cancelled);
  }
}

export const paymentService = new MockPaymentService();