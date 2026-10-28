import type { CreditNote, DocumentItem, CreditNoteStatus } from '@/types';
import type { CreditNoteService, ListParams } from '@/services/types';
import { mockCreditNotes } from '@/mocks/data';
import { delay, uid, matchesSearch, clone } from '@/mocks/helpers';
import { invoiceService } from '@/mocks/invoiceService';
import { calcInvoiceTotals, lineTTC } from '@/utils/calc';

class MockCreditNoteService implements CreditNoteService {
  private creditNotes: CreditNote[] = clone(mockCreditNotes);
  private seq = mockCreditNotes.length + 1;

  private nextNumber(): string {
    const year = new Date().getFullYear();
    return `AV-${year}-${String(this.seq++).padStart(4, '0')}`;
  }

  async list(params?: ListParams): Promise<CreditNote[]> {
    let result = this.creditNotes;
    if (params?.search) {
      const s = params.search;
      result = result.filter((cn) => matchesSearch(cn.number, s) || matchesSearch(cn.reason, s));
    }
    return delay([...result].sort((a, b) => b.date.localeCompare(a.date)));
  }

  async get(id: string): Promise<CreditNote | null> {
    return delay(this.creditNotes.find((cn) => cn.id === id) ?? null);
  }

  async createFromInvoice(invoiceId: string, items?: DocumentItem[], reason?: string): Promise<CreditNote> {
    // Read from the live invoice store, not the static seed data.
    const invoice = invoiceService._internalGet(invoiceId);
    if (!invoice) throw new Error('Facture introuvable');
    const now = new Date().toISOString();
    const cn: CreditNote = {
      id: uid('cn'),
      number: this.nextNumber(),
      clientId: invoice.clientId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      date: now,
      items: items ? clone(items) : clone(invoice.items),
      reason: reason ?? '',
      notes: '',
      status: 'brouillon',
      appliedAmount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.creditNotes.unshift(cn);
    return delay(cn);
  }

  async create(data: Omit<CreditNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditNote> {
    const now = new Date().toISOString();
    const cn: CreditNote = {
      ...data,
      number: data.number || this.nextNumber(),
      id: uid('cn'),
      createdAt: now,
      updatedAt: now,
    };
    this.creditNotes.unshift(cn);
    return delay(cn);
  }

  async update(id: string, data: Partial<CreditNote>): Promise<CreditNote> {
    const idx = this.creditNotes.findIndex((cn) => cn.id === id);
    if (idx === -1) throw new Error('Avoir introuvable');
    this.creditNotes[idx] = { ...this.creditNotes[idx], ...data, updatedAt: new Date().toISOString() };
    return delay(this.creditNotes[idx]);
  }

  async remove(id: string): Promise<void> {
    this.creditNotes = this.creditNotes.filter((cn) => cn.id !== id);
    return delay(undefined);
  }

  async apply(id: string): Promise<CreditNote> {
    const idx = this.creditNotes.findIndex((cn) => cn.id === id);
    if (idx === -1) throw new Error('Avoir introuvable');
    const cn = this.creditNotes[idx];
    if (cn.status === 'applique') throw new Error('Avoir déjà appliqué');
    const appliedAmount = cn.items.reduce(
      (sum, item) => sum + lineTTC(item),
      0,
    );
    cn.status = 'applique' as CreditNoteStatus;
    cn.appliedAmount = appliedAmount;
    cn.updatedAt = new Date().toISOString();

    // Update the linked invoice: increase creditNotesApplied and adjust paidAmount/status.
    const invoice = invoiceService._internalGet(cn.invoiceId);
    if (invoice) {
      const newCreditApplied = invoice.creditNotesApplied + appliedAmount;
      const totalTTC = calcInvoiceTotals(invoice).totalTTC;
      const effectivePaid = invoice.paidAmount + newCreditApplied;
      let newStatus = invoice.status;
      if (effectivePaid >= totalTTC) {
        newStatus = 'payee';
      } else if (effectivePaid > 0) {
        newStatus = 'partielle';
      }
      invoiceService._internalUpdate(cn.invoiceId, {
        creditNotesApplied: newCreditApplied,
        status: newStatus,
      });
    }

    return delay(cn);
  }
}

export const creditNoteService = new MockCreditNoteService();
