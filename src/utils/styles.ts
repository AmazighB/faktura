import type {
  ClientType, CreditNoteStatus, ExpenseCategory, InvoiceStatus, PaymentMethod, ProductType, QuoteStatus,
} from '@/types';

// Statuts : teinte douce + texte contrasté. Le rouge est réservé à l'urgence réelle (retard / refus).
const neutral = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
const info = 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300';
const warn = 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
const ok = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
const bad = 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300';
const muted = 'bg-gray-100 text-gray-400 line-through dark:bg-gray-800 dark:text-gray-500';

export const quoteStatusStyles: Record<QuoteStatus, string> = {
  brouillon: neutral, envoye: info, attente: warn, accepte: ok, refuse: bad, expire: muted,
};

export const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  brouillon: neutral, emise: info, partielle: warn, payee: ok, retard: bad, annulee: muted,
};

export const creditNoteStatusStyles: Record<CreditNoteStatus, string> = {
  brouillon: neutral,
  emis: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  applique: ok,
};

export const clientTypeDot: Record<ClientType, string> = { particulier: 'bg-gray-400', entreprise: 'bg-accent-500' };

export const productTypeDot: Record<ProductType, string> = {
  produit: 'bg-accent-400', service: 'bg-emerald-400', prestation: 'bg-amber-400',
};

export const paymentMethodIcon: Record<PaymentMethod, string> = {
  especes: 'text-gray-500', virement: 'text-gray-500', carte: 'text-gray-500',
  cheque: 'text-gray-500', en_ligne: 'text-gray-500', autre: 'text-gray-500',
};

export const expenseCategoryDot: Record<ExpenseCategory, string> = {
  fournitures: 'bg-accent-400', transport: 'bg-emerald-400', telecommunication: 'bg-amber-400',
  loyer: 'bg-red-400', equipement: 'bg-purple-400', logiciels: 'bg-cyan-400', autre: 'bg-gray-400',
};