import type { Invoice, InvoiceStatus } from '@/types';
import { computeTotals, round2 } from '@/utils/calc';

type Amounts = Pick<Invoice, 'items' | 'paidAmount' | 'creditNotesApplied'>;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Jour calendaire LOCAL (AAAA-MM-JJ). Évite les décalages dus à l'UTC (toISOString). */
export function localDay(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Total TTC de la facture. */
export function invoiceTotal(invoice: Pick<Invoice, 'items'>): number {
  return computeTotals(invoice.items).totalTTC;
}

/** Reste à payer = total TTC - paiements - avoirs appliqués (jamais négatif). */
export function amountDue(invoice: Amounts): number {
  return round2(Math.max(invoiceTotal(invoice) - invoice.paidAmount - (invoice.creditNotesApplied ?? 0), 0));
}

/**
 * Source de vérité du statut d'une facture émise, calculé à partir des montants et de l'échéance.
 * - brouillon / annulée : inchangé
 * - reste à payer nul : payée
 * - échéance strictement dépassée (jour calendaire) : en retard
 * - sinon : partiellement payée si un règlement ou un avoir existe, émise sinon
 */
export function statusFromAmounts(
  invoice: Amounts & Pick<Invoice, 'status' | 'dueDate'>,
  today: Date = new Date(),
): InvoiceStatus {
  if (invoice.status === 'brouillon' || invoice.status === 'annulee') return invoice.status;
  if (amountDue(invoice) <= 0) return 'payee';
  if (localDay(invoice.dueDate) < localDay(today)) return 'retard';
  return round2(invoice.paidAmount + (invoice.creditNotesApplied ?? 0)) > 0 ? 'partielle' : 'emise';
}

export function isIssued(status: InvoiceStatus): boolean {
  return status !== 'brouillon' && status !== 'annulee';
}