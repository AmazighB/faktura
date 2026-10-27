export type ID = string;

export type ClientType = 'particulier' | 'entreprise';

export type Wilaya = string;

export interface ClientGroup {
  id: ID;
  name: string;
  color: string;
  description?: string;
}

export interface Client {
  id: ID;
  name: string;
  type: ClientType;
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  address: string;
  wilaya: string;
  commune: string;
  phone: string;
  email: string;
  secondaryContact?: string;
  paymentConditions?: string;
  defaultDiscount?: number;
  groupId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface ProductCategory {
  id: ID;
  name: string;
  color: string;
  description?: string;
}

export type ProductType = 'produit' | 'service' | 'prestation';

export interface Product {
  id: ID;
  reference: string;
  name: string;
  description?: string;
  priceHT: number;
  vatRate: number;
  unit: string;
  category: string;
  type: ProductType;
  stockEnabled: boolean;
  stockQuantity?: number;
  active: boolean;
  createdAt: string;
}

export type QuoteStatus = 'brouillon' | 'envoye' | 'attente' | 'accepte' | 'refuse' | 'expire';

export type InvoiceStatus = 'brouillon' | 'emise' | 'partielle' | 'payee' | 'retard' | 'annulee';

export type CreditNoteStatus = 'brouillon' | 'emis' | 'applique';

export interface CreditNote {
  id: ID;
  number: string;
  clientId: ID;
  invoiceId: ID;
  invoiceNumber: string;
  date: string;
  items: DocumentItem[];
  reason: string;
  notes?: string;
  status: CreditNoteStatus;
  appliedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: ID;
  productId?: ID;
  designation: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  unit: string;
}

export interface Quote {
  id: ID;
  number: string;
  clientId: ID;
  date: string;
  expiryDate: string;
  items: DocumentItem[];
  notes?: string;
  conditions?: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: ID;
  number: string;
  clientId: ID;
  date: string;
  dueDate: string;
  items: DocumentItem[];
  notes?: string;
  conditions?: string;
  status: InvoiceStatus;
  paidAmount: number;
  creditNotesApplied: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'especes' | 'virement' | 'carte' | 'cheque' | 'en_ligne' | 'autre';

export interface Payment {
  id: ID;
  number: string;
  invoiceId: ID;
  clientId: ID;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'fournitures'
  | 'transport'
  | 'telecommunication'
  | 'loyer'
  | 'equipement'
  | 'logiciels'
  | 'autre';

export interface Expense {
  id: ID;
  date: string;
  supplierId?: ID;
  supplierName: string;
  category: ExpenseCategory;
  description: string;
  amountHT: number;
  vatRate: number;
  amountTTC: number;
  method: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface Supplier {
  id: ID;
  name: string;
  phone: string;
  email: string;
  address: string;
  taxId?: string;
  nif?: string;
  notes?: string;
  createdAt: string;
}

export type UserRole = 'admin' | 'comptable' | 'commercial' | 'employe';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export type PermissionModule =
  | 'dashboard'
  | 'clients'
  | 'products'
  | 'quotes'
  | 'invoices'
  | 'creditNotes'
  | 'payments'
  | 'expenses'
  | 'suppliers'
  | 'reports'
  | 'settings'
  | 'administration';

export type Permissions = Partial<Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>>;

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  permissions?: Permissions;
  lastLoginAt?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: ID;
  userId: ID;
  userName: string;
  action: string;
  entity?: string;
  entityId?: ID;
  details?: string;
  timestamp: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  bankDetails?: string;
  logo?: string;
}

export interface NumberingConfig {
  invoicePrefix: string;
  invoiceStart: number;
  invoicePad: number;
  quotePrefix: string;
  quoteStart: number;
  quotePad: number;
  creditNotePrefix: string;
  creditNoteStart: number;
  creditNotePad: number;
  useYear: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  encryption: 'none' | 'ssl' | 'tls';
  enabled: boolean;
}

export interface Settings {
  company: CompanyInfo;
  numbering: NumberingConfig;
  defaultVatRate: number;
  currency: string;
  defaultPaymentDelay: number;
  defaultQuoteValidity: number;
  paymentMethods: PaymentMethod[];
  invoiceTemplate: 'moderne' | 'classique' | 'minimal';
  quoteTemplate: 'moderne' | 'classique' | 'minimal';
  footer: string;
  terms: string;
  language: 'fr' | 'ar' | 'en';
  theme: 'light' | 'dark' | 'system';
  productCategories: ProductCategory[];
  clientGroups: ClientGroup[];
  smtp: SmtpConfig;
}

export interface SoftwareUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  lastChecked: string;
  channel: 'stable' | 'beta';
  autoUpdate: boolean;
  releaseNotes?: string;
}

export interface BackupRecord {
  id: ID;
  date: string;
  type: 'manuel' | 'automatique';
  size: string;
  location: string;
}

export interface Notification {
  id: ID;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  actionLabel?: string;
  actionRoute?: string;
}
