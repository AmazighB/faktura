export interface LineItem {
  quantity: number;
  unitPrice: number;
  discount: number; // percentage
  vatRate: number; // percentage
}

export interface Totals {
  subtotal: number;
  discountAmount: number;
  netHT: number;
  vatAmount: number;
  totalTTC: number;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Règle d'arrondi unique : chaque ligne est arrondie au centime (brut, remise, HT, TVA),
 * et tous les totaux sont la somme des lignes arrondies. Ainsi, ce qui est affiché
 * ligne par ligne s'additionne exactement au total.
 */
function lineParts(item: LineItem) {
  const gross = round2(item.quantity * item.unitPrice);
  const discount = round2(gross * (item.discount / 100));
  const ht = round2(gross - discount);
  const vat = round2(ht * (item.vatRate / 100));
  return { gross, discount, ht, vat, ttc: round2(ht + vat) };
}

export function lineHT(item: LineItem): number {
  return lineParts(item).ht;
}

export function lineVAT(item: LineItem): number {
  return lineParts(item).vat;
}

export function lineTTC(item: LineItem): number {
  return lineParts(item).ttc;
}

export function computeTotals(items: LineItem[]): Totals {
  let subtotal = 0;
  let discountAmount = 0;
  let netHT = 0;
  let vatAmount = 0;
  for (const item of items) {
    const p = lineParts(item);
    subtotal += p.gross;
    discountAmount += p.discount;
    netHT += p.ht;
    vatAmount += p.vat;
  }
  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    netHT: round2(netHT),
    vatAmount: round2(vatAmount),
    totalTTC: round2(netHT + vatAmount),
  };
}

export function calcInvoiceTotals(invoice: { items: LineItem[] }): { totalHT: number; totalTTC: number; vatAmount: number } {
  const totals = computeTotals(invoice.items);
  return {
    totalHT: totals.netHT,
    totalTTC: totals.totalTTC,
    vatAmount: totals.vatAmount,
  };
}