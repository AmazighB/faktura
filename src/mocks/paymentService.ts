import type { Payment } from '@/types';
import type { PaymentService, ListParams } from '@/services/types';
import { mockPayments } from '@/mocks/data';
import { delay, uid, matchesSearch, clone } from '@/mocks/helpers';
import { invoiceService } from '@/mocks/invoiceService';
import { calcInvoiceTotals } from '@/utils/calc';

class MockPaymentService implements PaymentService {
  private payments: Payment[] = clone(mockPayments);
  private seq = mockPayments.length + 1;

  private nextNumber(): string {
    const year = new Date().getFullYear();
    return `PAY-${year}-${String(this.seq++).padStart(4, '0')}`;
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
    const payment: Payment = {
      ...data,
      number: data.number || this.nextNumber(),
      id: uid('pay'),
      createdAt: new Date().toISOString(),
    };
    this.payments.unshift(payment);

    // Update the linked invoice's paidAmount and status.
    const invoice = invoiceService._internalGet(payment.invoiceId);
    if (invoice) {
      const newPaidAmount = invoice.paidAmount + payment.amount;
      const totalTTC = calcInvoiceTotals(invoice).totalTTC;
      let newStatus = invoice.status;
      if (newPaidAmount >= totalTTC) {
        newStatus = 'payee';
      } else if (newPaidAmount > 0) {
        newStatus = 'partielle';
      }
      invoiceService._internalUpdate(payment.invoiceId, {
        paidAmount: newPaidAmount,
        status: newStatus,
      });
    }

    return delay(payment);
  }

  async remove(id: string): Promise<void> {
    const payment = this.payments.find((p) => p.id === id);
    this.payments = this.payments.filter((p) => p.id !== id);

    // Reverse the payment effect on the invoice.
    if (payment) {
      const invoice = invoiceService._internalGet(payment.invoiceId);
      if (invoice) {
        const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount);
        const totalTTC = calcInvoiceTotals(invoice).totalTTC;
        let newStatus = invoice.status;
        if (newPaidAmount <= 0) {
          newStatus = invoice.dueDate < new Date().toISOString() ? 'retard' : 'emise';
        } else if (newPaidAmount < totalTTC) {
          newStatus = 'partielle';
        }
        invoiceService._internalUpdate(payment.invoiceId, {
          paidAmount: newPaidAmount,
          status: newStatus,
        });
      }
    }

    return delay(undefined);
  }
}

export const paymentService = new MockPaymentService();
