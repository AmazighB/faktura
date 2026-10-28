import type { ReactNode } from 'react';
import { formatCurrency, formatDate } from '@/utils/format';
import { computeTotals, lineHT } from '@/utils/calc';
import type { Client, DocumentItem, CompanyInfo } from '@/types';

interface DocumentPreviewProps {
  type: 'facture' | 'devis' | 'avoir' | 'recu';
  number: string;
  date: string;
  dueDateOrExpiry: string;
  client: Client | null;
  items: DocumentItem[];
  notes?: string;
  conditions?: string;
  company: CompanyInfo;
  currency: string;
  template?: 'moderne' | 'classique' | 'minimal';
  paidAmount?: number;
  children?: ReactNode;
}

const typeLabels = {
  facture: 'FACTURE',
  devis: 'DEVIS',
  avoir: 'AVOIR',
  recu: 'REÇU',
};

export function DocumentPreview({
  type,
  number,
  date,
  dueDateOrExpiry,
  client,
  items,
  notes,
  conditions,
  company,
  currency,
  template = 'moderne',
  paidAmount = 0,
}: DocumentPreviewProps) {
  const totals = computeTotals(items);
  const remaining = totals.totalTTC - paidAmount;

  return (
    <div className="mx-auto max-w-[800px] bg-white p-8 text-black shadow-sm" id="document-preview">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="h-12 max-w-[140px] object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-600 text-white">
                <span className="text-lg font-bold">F</span>
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-gray-900">{company.name}</p>
              <p className="text-xs text-gray-500">{company.address}</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            <p>Tél: {company.phone}</p>
            <p>Email: {company.email}</p>
            {company.nif && <p>NIF: {company.nif}</p>}
            {company.rc && <p>RC: {company.rc}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-wide text-gray-900">{typeLabels[type]}</p>
          <p className="mt-1 text-sm font-medium text-gray-700">{number}</p>
          <div className="mt-3 text-xs text-gray-500">
            <p>Date: {formatDate(date)}</p>
            <p>{type === 'devis' ? "Valable jusqu'au" : 'Échéance'}: {formatDate(dueDateOrExpiry)}</p>
          </div>
        </div>
      </div>

      {/* Client */}
      <div className="mt-6 flex justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Facturé à</p>
          <div className="mt-1.5 text-sm">
            <p className="font-semibold text-gray-900">{client?.name ?? '—'}</p>
            <p className="text-gray-600">{client?.address}</p>
            <p className="text-gray-600">{client?.commune}, {client?.wilaya}</p>
            {client?.phone && <p className="text-gray-600">Tél: {client.phone}</p>}
            {client?.email && <p className="text-gray-600">{client.email}</p>}
            {client?.nif && <p className="text-gray-600">NIF: {client.nif}</p>}
          </div>
        </div>
      </div>

      {/* Items */}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="pb-2 pr-3">Désignation</th>
            <th className="w-16 pb-2 pr-3 text-right">Qté</th>
            <th className="w-28 pb-2 pr-3 text-right">P.U. HT</th>
            <th className="w-20 pb-2 pr-3 text-right">TVA</th>
            <th className="w-32 pb-2 text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-3 pr-3">
                <p className="font-medium text-gray-800">{item.designation}</p>
                {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
              </td>
              <td className="py-3 pr-3 text-right text-gray-700 num-amount">{item.quantity} {item.unit}</td>
              <td className="py-3 pr-3 text-right text-gray-700 num-amount">{formatCurrency(item.unitPrice, currency)}</td>
              <td className="py-3 pr-3 text-right text-gray-700 num-amount">{item.vatRate}%</td>
              <td className="py-3 text-right font-medium text-gray-900 num-amount">{formatCurrency(lineHT(item), currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-72 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Sous-total</span>
            <span className="num-amount">{formatCurrency(totals.subtotal, currency)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Remise</span>
              <span className="num-amount">-{formatCurrency(totals.discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Total HT</span>
            <span className="num-amount">{formatCurrency(totals.netHT, currency)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>TVA</span>
            <span className="num-amount">{formatCurrency(totals.vatAmount, currency)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
            <span>Total TTC</span>
            <span className="num-amount">{formatCurrency(totals.totalTTC, currency)}</span>
          </div>
          {paidAmount > 0 && type !== 'recu' && (
            <>
              <div className="flex justify-between text-gray-600">
                <span>Payé</span>
                <span className="num-amount">{formatCurrency(paidAmount, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Reste à payer</span>
                <span className="num-amount">{formatCurrency(remaining, currency)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes & conditions */}
      {(notes || conditions || company.bankDetails) && (
        <div className="mt-8 space-y-3 text-xs text-gray-500">
          {notes && (
            <div>
              <p className="font-medium text-gray-600">Notes</p>
              <p>{notes}</p>
            </div>
          )}
          {conditions && (
            <div>
              <p className="font-medium text-gray-600">Conditions</p>
              <p>{conditions}</p>
            </div>
          )}
          {company.bankDetails && (
            <div>
              <p className="font-medium text-gray-600">Coordonnées bancaires</p>
              <p>{company.bankDetails}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        {company.name} — {company.address} — {company.phone}
      </div>
    </div>
  );
}
