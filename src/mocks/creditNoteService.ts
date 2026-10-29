import type { CreditNote, DocumentItem, CreditNoteStatus } from '@/types';
import type { CreditNoteService, ListParams } from '@/services/types';
import { mockCreditNotes } from '@/mocks/data';
import { delay, uid, matchesSearch, clone } from '@/mocks/helpers';
import { invoiceService } from '@/mocks/invoiceService';
import { lineTTC, round2 } from '@/utils/calc';
import { invoiceTotal, isIssued } from '@/utils/invoice';
import { settingsService } from '@/mocks/miscServices';
import { nextDocumentNumber } from '@/utils/numbering';

class MockCreditNoteService implements CreditNoteService {
  private creditNotes: CreditNote[] = clone(mockCreditNotes);
  private async nextNumber(): Promise<string> {
    const { numbering } = await settingsService.get();
    return nextDocumentNumber(this.creditNotes.map((c) => c.number), numbering, 'creditNote');
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
      number: await this.nextNumber(),
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
      number: !data.number || this.creditNotes.some((c) => c.number === data.number) ? await this.nextNumber() : data.number,
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

    const invoice = invoiceService._internalGet(cn.invoiceId);
    if (!invoice) throw new Error('Facture introuvable');
    if (!isIssued(invoice.status)) throw new Error('Un avoir ne peut s\'appliquer qu\'à une facture émise et non annulée.');

    const amount = round2(cn.items.reduce((sum, item) => sum + lineTTC(item), 0));
    if (!(amount > 0)) throw new Error('Le montant de l\'avoir doit être supérieur à zéro.');
    // Plafond : le cumul des avoirs ne peut pas dépasser le total de la facture.
    const creditable = round2(invoiceTotal(invoice) - invoice.creditNotesApplied);
    if (amount > creditable) {
      throw new Error(`Cet avoir (${amount.toFixed(2)}) dépasse le montant restant à créditer sur la facture (${creditable.toFixed(2)}).`);
    }

    cn.status = 'applique' as CreditNoteStatus;
    cn.appliedAmount = amount;
    cn.updatedAt = new Date().toISOString();
    invoiceService._internalUpdate(invoice.id, { creditNotesApplied: round2(invoice.creditNotesApplied + amount) });
    return delay(cn);
  }
}

export const creditNoteService = new MockCreditNoteService();