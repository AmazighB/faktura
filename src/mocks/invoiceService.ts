import type { Invoice } from '@/types';
import type { InvoiceService, ListParams } from '@/services/types';
import { mockInvoices } from '@/mocks/data';
import { delay, uid, matchesSearch, clone } from '@/mocks/helpers';
import { settingsService } from '@/mocks/miscServices';
import { amountDue, invoiceTotal, isIssued, statusFromAmounts } from '@/utils/invoice';
import { nextDocumentNumber } from '@/utils/numbering';
import { addDays, toISODate } from '@/utils/format';

/** Champs figés dès qu'une facture est émise : toute correction passe par un avoir. */
const LOCKED_FIELDS: ('number' | 'clientId' | 'date' | 'dueDate' | 'items')[] = ['number', 'clientId', 'date', 'dueDate', 'items'];

class MockInvoiceService implements InvoiceService {
  private invoices: Invoice[] = clone(mockInvoices);

  /** Le statut est toujours dérivé des montants et de l'échéance (retard calculé, jamais périmé). */
  private view(invoice: Invoice): Invoice {
    return { ...invoice, status: statusFromAmounts(invoice) };
  }

  /** Numéro unique : plus grand numéro existant de la série + 1 (et non le nombre de factures). */
  async nextNumber(): Promise<string> {
    const { numbering } = await settingsService.get();
    return nextDocumentNumber(this.invoices.map((i) => i.number), numbering, 'invoice');
  }

  private assertIssuable(data: Pick<Invoice, 'clientId' | 'items'>) {
    if (!data.clientId) throw new Error('Choisissez un client avant d\'émettre la facture.');
    if (!data.items.length) throw new Error('Ajoutez au moins une ligne avant d\'émettre la facture.');
    if (invoiceTotal(data) <= 0) throw new Error('Le total de la facture doit être supérieur à zéro.');
  }

  async list(params?: ListParams): Promise<Invoice[]> {
    let result = this.invoices;
    if (params?.search) {
      const s = params.search;
      result = result.filter((i) => matchesSearch(i.number, s));
    }
    return delay([...result].map((i) => this.view(i)).sort((a, b) => b.date.localeCompare(a.date)));
  }

  async get(id: string): Promise<Invoice | null> {
    const found = this.invoices.find((i) => i.id === id);
    return delay(found ? this.view(found) : null);
  }

  async create(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    if (data.status !== 'brouillon') this.assertIssuable(data);
    const taken = !data.number || this.invoices.some((i) => i.number === data.number);
    const number = taken ? await this.nextNumber() : data.number;
    const now = new Date().toISOString();
    const invoice: Invoice = {
      ...data,
      number,
      // Un nouveau document n'a ni règlement ni avoir : ces champs ne viennent jamais de l'extérieur.
      paidAmount: 0,
      creditNotesApplied: 0,
      id: uid('i'),
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.unshift(invoice);
    return delay(this.view(invoice));
  }

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const idx = this.invoices.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Facture introuvable');
    const current = this.invoices[idx];
    // Les règlements et avoirs ne se modifient que par leurs propres services.
    const { paidAmount: _p, creditNotesApplied: _c, ...patch } = data;

    if (current.status === 'brouillon') {
      if (patch.status && patch.status !== 'brouillon' && patch.status !== 'emise') {
        throw new Error('Une facture en brouillon ne peut être qu\'enregistrée ou émise.');
      }
      if (patch.status === 'emise') this.assertIssuable({ clientId: patch.clientId ?? current.clientId, items: patch.items ?? current.items });
    } else {
      const changed = LOCKED_FIELDS.filter((k) => k in patch && JSON.stringify(patch[k]) !== JSON.stringify(current[k]));
      if (changed.length > 0) {
        throw new Error('Cette facture est émise : elle n\'est plus modifiable. Créez un avoir pour la corriger.');
      }
      if (patch.status && patch.status !== current.status) {
        if (patch.status !== 'annulee') throw new Error('Le statut d\'une facture émise est calculé automatiquement.');
        if (current.paidAmount > 0 || current.creditNotesApplied > 0) {
          throw new Error('Une facture déjà réglée (même partiellement) ne peut pas être annulée. Créez un avoir.');
        }
      } else {
        delete patch.status;
      }
    }

    this.invoices[idx] = { ...current, ...patch, updatedAt: new Date().toISOString() };
    return delay(this.view(this.invoices[idx]));
  }

  async remove(id: string): Promise<void> {
    const invoice = this.invoices.find((i) => i.id === id);
    if (invoice && isIssued(invoice.status)) {
      throw new Error('Une facture émise ne peut pas être supprimée. Annulez-la ou créez un avoir.');
    }
    if (invoice && invoice.status === 'annulee') {
      throw new Error('Une facture annulée est conservée pour la traçabilité.');
    }
    this.invoices = this.invoices.filter((i) => i.id !== id);
    return delay(undefined);
  }

  async duplicate(id: string): Promise<Invoice> {
    const original = this.invoices.find((i) => i.id === id);
    if (!original) throw new Error('Facture introuvable');
    const settings = await settingsService.get();
    const now = new Date().toISOString();
    const today = new Date();
    const copy: Invoice = {
      ...clone(original),
      id: uid('i'),
      number: await this.nextNumber(),
      date: toISODate(today),
      dueDate: toISODate(addDays(today, settings.defaultPaymentDelay ?? 30)),
      status: 'brouillon',
      paidAmount: 0,
      creditNotesApplied: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.unshift(copy);
    return delay(this.view(copy));
  }

  /** Réservé aux services de paiements et d'avoirs : met à jour les montants et recalcule le statut. */
  _internalUpdate(id: string, patch: Partial<Pick<Invoice, 'paidAmount' | 'creditNotesApplied'>>): Invoice | null {
    const idx = this.invoices.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const next = { ...this.invoices[idx], ...patch, updatedAt: new Date().toISOString() };
    next.status = statusFromAmounts(next);
    this.invoices[idx] = next;
    return next;
  }

  _internalGet(id: string): Invoice | null {
    const found = this.invoices.find((i) => i.id === id);
    return found ? this.view(found) : null;
  }

  _amountDue(id: string): number {
    const found = this.invoices.find((i) => i.id === id);
    return found ? amountDue(found) : 0;
  }
}

export const invoiceService = new MockInvoiceService();