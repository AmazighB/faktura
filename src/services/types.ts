import type { Client, CreditNote, Invoice, Payment, Product, Quote, Expense, Supplier, User, ActivityLog, Settings, Notification, BackupRecord } from '@/types';

export interface ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ClientService {
  list(params?: ListParams): Promise<Client[]>;
  get(id: string): Promise<Client | null>;
  create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt'>): Promise<Client>;
  update(id: string, data: Partial<Client>): Promise<Client>;
  remove(id: string): Promise<void>;
}

export interface ProductService {
  list(params?: ListParams): Promise<Product[]>;
  get(id: string): Promise<Product | null>;
  create(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product>;
  update(id: string, data: Partial<Product>): Promise<Product>;
  remove(id: string): Promise<void>;
}

export interface QuoteService {
  list(params?: ListParams): Promise<Quote[]>;
  get(id: string): Promise<Quote | null>;
  create(data: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quote>;
  update(id: string, data: Partial<Quote>): Promise<Quote>;
  remove(id: string): Promise<void>;
  convertToInvoice(id: string): Promise<Invoice>;
  duplicate(id: string): Promise<Quote>;
}

export interface InvoiceService {
  addReminder(id: string, reminder: Omit<import('@/types').Reminder, 'id'>): Promise<Invoice>;
  list(params?: ListParams): Promise<Invoice[]>;
  get(id: string): Promise<Invoice | null>;
  create(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>;
  update(id: string, data: Partial<Invoice>): Promise<Invoice>;
  remove(id: string): Promise<void>;
  duplicate(id: string): Promise<Invoice>;
}

export interface PaymentService {
  list(params?: ListParams): Promise<Payment[]>;
  getByInvoice(invoiceId: string): Promise<Payment[]>;
  create(data: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment>;
  /** Annule un paiement (motif obligatoire) : il reste dans l'historique et la facture est recalculée. */
  cancel(id: string, reason: string): Promise<Payment>;
}

export interface ExpenseService {
  list(params?: ListParams): Promise<Expense[]>;
  create(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense>;
  update(id: string, data: Partial<Expense>): Promise<Expense>;
  remove(id: string): Promise<void>;
}

export interface SupplierService {
  list(params?: ListParams): Promise<Supplier[]>;
  get(id: string): Promise<Supplier | null>;
  create(data: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier>;
  update(id: string, data: Partial<Supplier>): Promise<Supplier>;
  remove(id: string): Promise<void>;
}

export interface UserService {
  list(): Promise<User[]>;
  /** Crée l'utilisateur avec son mot de passe initial (règle : 8 caractères, lettre + chiffre). */
  create(data: Omit<User, 'id' | 'createdAt'>, password: string): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  remove(id: string): Promise<void>;
}

export interface ActivityLogService {
  list(): Promise<ActivityLog[]>;
  log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): void;
}

export interface SettingsService {
  get(): Promise<Settings>;
  update(data: Partial<Settings>): Promise<Settings>;
}

export interface NotificationService {
  list(): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface BackupService {
  list(): Promise<BackupRecord[]>;
  createManual(): Promise<BackupRecord>;
  restore(id: string): Promise<void>;
}

export interface CreditNoteService {
  list(params?: ListParams): Promise<CreditNote[]>;
  get(id: string): Promise<CreditNote | null>;
  createFromInvoice(invoiceId: string, items?: import('@/types').DocumentItem[], reason?: string): Promise<CreditNote>;
  create(data: Omit<CreditNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditNote>;
  update(id: string, data: Partial<CreditNote>): Promise<CreditNote>;
  remove(id: string): Promise<void>;
  apply(id: string): Promise<CreditNote>;
}

export interface AppServices {
  auth: AuthService;
  clients: ClientService;
  products: ProductService;
  quotes: QuoteService;
  invoices: InvoiceService;
  creditNotes: CreditNoteService;
  payments: PaymentService;
  expenses: ExpenseService;
  suppliers: SupplierService;
  users: UserService;
  activityLogs: ActivityLogService;
  settings: SettingsService;
  notifications: NotificationService;
  backups: BackupService;
}

export interface AuthSession {
  user: User;
}

export interface AuthService {
  /** Vérifie l'identifiant et le mot de passe. Lève une AuthError (identifiants, compte désactivé, trop d'essais). */
  login(email: string, password: string): Promise<AuthSession>;
  /** Vérifie le mot de passe de l'utilisateur connecté (déverrouillage de session). Lève une AuthError. */
  verifyPassword(userId: string, password: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  /** Définit un nouveau mot de passe sans connaître l'ancien (réinitialisation par un administrateur). */
  setPassword(userId: string, newPassword: string): Promise<void>;
  /** Utilisateur courant tel que connu du serveur (null s'il n'existe plus). */
  getUser(userId: string): Promise<User | null>;
}