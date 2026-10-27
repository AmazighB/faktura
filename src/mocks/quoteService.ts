import type { Quote, Invoice, InvoiceStatus } from '@/types';
import type { QuoteService, ListParams } from '@/services/types';
import { mockQuotes } from '@/mocks/data';
import { delay, uid, matchesSearch, clone } from '@/mocks/helpers';
import { invoiceService } from '@/mocks/invoiceService';

class MockQuoteService implements QuoteService {
  private quotes: Quote[] = clone(mockQuotes);

  async list(params?: ListParams): Promise<Quote[]> {
    let result = this.quotes;
    if (params?.search) {
      const s = params.search;
      result = result.filter((q) => matchesSearch(q.number, s));
    }
    return delay([...result].sort((a, b) => b.date.localeCompare(a.date)));
  }

  async get(id: string): Promise<Quote | null> {
    return delay(this.quotes.find((q) => q.id === id) ?? null);
  }

  async create(data: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quote> {
    const now = new Date().toISOString();
    const quote: Quote = { ...data, id: uid('q'), createdAt: now, updatedAt: now };
    this.quotes.unshift(quote);
    return delay(quote);
  }

  async update(id: string, data: Partial<Quote>): Promise<Quote> {
    const idx = this.quotes.findIndex((q) => q.id === id);
    if (idx === -1) throw new Error('Devis introuvable');
    this.quotes[idx] = { ...this.quotes[idx], ...data, updatedAt: new Date().toISOString() };
    return delay(this.quotes[idx]);
  }

  async remove(id: string): Promise<void> {
    this.quotes = this.quotes.filter((q) => q.id !== id);
    return delay(undefined);
  }

  async convertToInvoice(id: string): Promise<Invoice> {
    const quote = this.quotes.find((q) => q.id === id);
    if (!quote) throw new Error('Devis introuvable');
    const now = new Date().toISOString();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const invoice: Invoice = {
      id: uid('i'),
      number: invoiceService._generateNumber(),
      clientId: quote.clientId,
      date: now,
      dueDate: dueDate.toISOString(),
      items: clone(quote.items),
      notes: quote.notes,
      conditions: quote.conditions,
      status: 'emise' as InvoiceStatus,
      paidAmount: 0,
      creditNotesApplied: 0,
      createdAt: now,
      updatedAt: now,
    };
    // Persist to the invoice store so navigation to the new invoice works.
    await invoiceService.create({
      number: invoice.number,
      clientId: invoice.clientId,
      date: invoice.date,
      dueDate: invoice.dueDate,
      items: invoice.items,
      notes: invoice.notes,
      conditions: invoice.conditions,
      status: invoice.status,
      paidAmount: invoice.paidAmount,
      creditNotesApplied: invoice.creditNotesApplied,
    });
    // Mark quote as accepted.
    await this.update(id, { status: 'accepte' });
    return delay(invoice);
  }
}

export const quoteService = new MockQuoteService();
