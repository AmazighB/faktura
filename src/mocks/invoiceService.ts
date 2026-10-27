import type { Invoice, DocumentItem } from '@/types';
import type { InvoiceService, ListParams } from '@/services/types';
import { mockInvoices } from '@/mocks/data';
import { delay, uid, matchesSearch, clone } from '@/mocks/helpers';

class MockInvoiceService implements InvoiceService {
  private invoices: Invoice[] = clone(mockInvoices);
  private seq: number;

  constructor() {
    this.seq = mockInvoices.length + 1;
  }

  private nextNumber(): string {
    const year = new Date().getFullYear();
    return `FAC-${year}-${String(this.seq++).padStart(4, '0')}`;
  }

  async list(params?: ListParams): Promise<Invoice[]> {
    let result = this.invoices;
    if (params?.search) {
      const s = params.search;
      result = result.filter((i) => matchesSearch(i.number, s));
    }
    return delay([...result].sort((a, b) => b.date.localeCompare(a.date)));
  }

  async get(id: string): Promise<Invoice | null> {
    return delay(this.invoices.find((i) => i.id === id) ?? null);
  }

  async create(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const now = new Date().toISOString();
    const invoice: Invoice = {
      ...data,
      number: data.number || this.nextNumber(),
      id: uid('i'),
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.unshift(invoice);
    return delay(invoice);
  }

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const idx = this.invoices.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Facture introuvable');
    this.invoices[idx] = { ...this.invoices[idx], ...data, updatedAt: new Date().toISOString() };
    return delay(this.invoices[idx]);
  }

  async remove(id: string): Promise<void> {
    this.invoices = this.invoices.filter((i) => i.id !== id);
    return delay(undefined);
  }

  async duplicate(id: string): Promise<Invoice> {
    const original = this.invoices.find((i) => i.id === id);
    if (!original) throw new Error('Facture introuvable');
    const now = new Date().toISOString();
    const copy: Invoice = {
      ...clone(original),
      id: uid('i'),
      number: this.nextNumber(),
      status: 'brouillon',
      paidAmount: 0,
      creditNotesApplied: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.unshift(copy);
    return delay(copy);
  }

  async createCreditNote(id: string, items?: DocumentItem[]): Promise<Invoice> {
    const original = this.invoices.find((i) => i.id === id);
    if (!original) throw new Error('Facture introuvable');
    const now = new Date().toISOString();
    const creditNote: Invoice = {
      ...clone(original),
      id: uid('av'),
      number: `AV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100) + 1).padStart(4, '0')}`,
      items: items ? clone(items) : clone(original.items),
      status: 'brouillon',
      paidAmount: 0,
      creditNotesApplied: 0,
      createdAt: now,
      updatedAt: now,
    };
    return delay(creditNote);
  }

  /** Internal method used by payment/credit-note services to update invoice state. */
  _internalUpdate(id: string, patch: Partial<Invoice>): Invoice | null {
    const idx = this.invoices.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this.invoices[idx] = { ...this.invoices[idx], ...patch, updatedAt: new Date().toISOString() };
    return this.invoices[idx];
  }

  _internalGet(id: string): Invoice | null {
    return this.invoices.find((i) => i.id === id) ?? null;
  }

  _generateNumber(): string {
    return this.nextNumber();
  }
}

export const invoiceService = new MockInvoiceService();
