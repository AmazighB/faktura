import type { Payment } from '@/types';

/** Un paiement sans statut (données anciennes) est un paiement valide. */
export function isActivePayment(payment: Pick<Payment, 'status'>): boolean {
  return payment.status !== 'annule';
}

/** Paiements pris en compte dans les totaux (les paiements annulés restent visibles dans l'historique). */
export function activePayments<T extends Pick<Payment, 'status'>>(payments: T[]): T[] {
  return payments.filter(isActivePayment);
}

export const MIN_CANCEL_REASON_LENGTH = 3;

export const CANCEL_REASON_SUGGESTIONS = ['Erreur de saisie', 'Doublon', 'Chèque impayé', 'Remboursement au client'];