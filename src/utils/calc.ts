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

export function lineHT(item: LineItem): number {
  const gross = item.quantity * item.unitPrice;
  const discountAmount = gross * (item.discount / 100);
  return round2(gross - discountAmount);
}

export function lineTTC(item: LineItem): number {
  const ht = lineHT(item);
  return round2(ht * (1 + item.vatRate / 100));
}

export function computeTotals(items: LineItem[]): Totals {
  let subtotal = 0;
  let discountAmount = 0;
  let netHT = 0;
  let vatAmount = 0;

  for (const item of items) {
    const gross = item.quantity * item.unitPrice;
    const lineDiscount = gross * (item.discount / 100);
    const ht = gross - lineDiscount;
    const vat = ht * (item.vatRate / 100);
    subtotal += gross;
    discountAmount += lineDiscount;
    netHT += ht;
    vatAmount += vat;
  }

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    netHT: round2(netHT),
    vatAmount: round2(vatAmount),
    totalTTC: round2(netHT + vatAmount),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcInvoiceTotals(invoice: { items: LineItem[] }): { totalHT: number; totalTTC: number; vatAmount: number } {
  const totals = computeTotals(invoice.items);
  return {
    totalHT: totals.netHT,
    totalTTC: totals.totalTTC,
    vatAmount: totals.vatAmount,
  };
}
