import type {
  ClientType,
  ExpenseCategory,
  InvoiceStatus,
  PaymentMethod,
  ProductType,
  QuoteStatus,
  CreditNoteStatus,
  UserRole,
} from '@/types';

export const clientTypeLabels: Record<ClientType, string> = {
  particulier: 'Particulier',
  entreprise: 'Entreprise',
};

export const productTypeLabels: Record<ProductType, string> = {
  produit: 'Produit',
  service: 'Service',
  prestation: 'Prestation',
};

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  attente: 'En attente',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  brouillon: 'Brouillon',
  emise: 'Émise',
  partielle: 'Partiellement payée',
  payee: 'Payée',
  retard: 'En retard',
  annulee: 'Annulée',
};

export const creditNoteStatusLabels: Record<CreditNoteStatus, string> = {
  brouillon: 'Brouillon',
  emis: 'Émis',
  applique: 'Appliqué',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  especes: 'Espèces',
  virement: 'Virement',
  carte: 'Carte',
  cheque: 'Chèque',
  en_ligne: 'Paiement en ligne',
  autre: 'Autre',
};

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  fournitures: 'Fournitures',
  transport: 'Transport',
  telecommunication: 'Télécommunication',
  loyer: 'Loyer',
  equipement: 'Équipement',
  logiciels: 'Logiciels',
  autre: 'Autre',
};

export const userRoleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  comptable: 'Comptable',
  commercial: 'Commercial',
  employe: 'Employé',
};

export const notificationTypeLabels = {
  info: 'Information',
  success: 'Succès',
  warning: 'Avertissement',
  error: 'Erreur',
} as const;
