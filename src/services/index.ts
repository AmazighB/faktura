import type { AppServices } from '@/services/types';
import { clientService } from '@/mocks/clientService';
import { productService } from '@/mocks/productService';
import { quoteService } from '@/mocks/quoteService';
import { invoiceService } from '@/mocks/invoiceService';
import { creditNoteService } from '@/mocks/creditNoteService';
import { paymentService } from '@/mocks/paymentService';
import { expenseService } from '@/mocks/expenseService';
import { supplierService } from '@/mocks/supplierService';
import { userService, activityLogService, settingsService, notificationService, backupService } from '@/mocks/miscServices';

// Currently backed by mock implementations.
// To switch to a Rust/Tauri backend later, replace each mock with a RustXxxService
// that calls Tauri commands — the service interface (types.ts) stays the same.
export const services: AppServices = {
  clients: clientService,
  products: productService,
  quotes: quoteService,
  invoices: invoiceService,
  creditNotes: creditNoteService,
  payments: paymentService,
  expenses: expenseService,
  suppliers: supplierService,
  users: userService,
  activityLogs: activityLogService,
  settings: settingsService,
  notifications: notificationService,
  backups: backupService,
};
