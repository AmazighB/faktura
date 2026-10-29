import type { Quote, Invoice } from '@/types';
import type { QuoteService, ListParams } from '@/services/types';
import { mockQuotes } from '@/mocks/data';
import { delay, uid, matchesSearch, clone, persistentStore } from '@/mocks/helpers';
import { invoiceService } from '@/mocks/invoiceService';
import { settingsService } from '@/mocks/miscServices';
import { nextDocumentNumber } from '@/utils/numbering';
import { addDays, toISODate } from '@/utils/format';

class MockQuoteService implements QuoteService {
  private quotesStore = persistentStore<Quote>('quotes', mockQuotes);
  private get quotes(): Quote[] { return this.quotesStore.items; }
  private set quotes(v: Quote[]) { this.quotesStore.items = v; }

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
    let number = data.number;
    if (!number || this.quotes.some((q) => q.number === number)) {
      const { numbering } = await settingsService.get();
      number = nextDocumentNumber(this.quotes.map((q) => q.number), numbering, 'quote');
    }
    const quote: Quote = { ...data, number, convertedInvoiceId: undefined, id: uid('q'), createdAt: now, updatedAt: now };
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
    const target = this.quotes.find((x) => x.id === id);
    if (target?.convertedInvoiceId && invoiceService._internalGet(target.convertedInvoiceId)) {
      throw new Error('Ce devis a été converti en facture : il est conservé pour la traçabilité.');
    }
    this.quotes = this.quotes.filter((q) => q.id !== id);
    return delay(undefined);
  }

  async duplicate(id: string): Promise<Quote> {
    const original = this.quotes.find((x) => x.id === id);
    if (!original) throw new Error('Devis introuvable');
    const settings = await settingsService.get();
    const today = new Date();
    const now = today.toISOString();
    const copy: Quote = {
      ...clone(original),
      id: uid('q'),
      number: nextDocumentNumber(this.quotes.map((x) => x.number), settings.numbering, 'quote'),
      date: toISODate(today),
      expiryDate: toISODate(addDays(today, settings.defaultQuoteValidity ?? 30)),
      status: 'brouillon',
      convertedInvoiceId: undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.quotes.unshift(copy);
    return delay(copy);
  }

  _internalList(): Quote[] {
    return [...this.quotes];
  }

  async convertToInvoice(id: string): Promise<Invoice> {
    const quote = this.quotes.find((q) => q.id === id);
    if (!quote) throw new Error('Devis introuvable');
    if (quote.convertedInvoiceId) {
      const existing = invoiceService._internalGet(quote.convertedInvoiceId);
      if (existing) throw new Error(`Ce devis a déjà été converti en facture ${existing.number}.`);
    }
    const settings = await settingsService.get();
    const today = new Date();
    // La facture est créée en brouillon : relecture possible avant l'émission (qui attribue un numéro définitif).
    const invoice = await invoiceService.create({
      number: '',
      clientId: quote.clientId,
      date: toISODate(today),
      dueDate: toISODate(addDays(today, settings.defaultPaymentDelay ?? 30)),
      items: clone(quote.items),
      notes: quote.notes,
      conditions: quote.conditions,
      status: 'brouillon',
      paidAmount: 0,
      creditNotesApplied: 0,
    });
    await this.update(id, { status: 'accepte', convertedInvoiceId: invoice.id });
    return invoice;
  }
}

export const quoteService = new MockQuoteService();