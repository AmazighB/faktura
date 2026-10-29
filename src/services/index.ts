import type { AppServices } from '@/services/types';
import { saveAll } from '@/mocks/helpers';
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
/** Enregistre l'état de toutes les collections après chaque opération (les méthodes `_interne` sont ignorées). */
function withPersistence<T extends object>(service: T): T {
  return new Proxy(service, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function' || String(prop).startsWith('_')) return value;
      return (...args: unknown[]) => {
        const result = value.apply(target, args);
        if (result instanceof Promise) return result.finally(saveAll);
        saveAll();
        return result;
      };
    },
  });
}

export const services: AppServices = {
  clients: withPersistence(clientService),
  products: withPersistence(productService),
  quotes: withPersistence(quoteService),
  invoices: withPersistence(invoiceService),
  creditNotes: withPersistence(creditNoteService),
  payments: withPersistence(paymentService),
  expenses: withPersistence(expenseService),
  suppliers: withPersistence(supplierService),
  users: withPersistence(userService),
  activityLogs: withPersistence(activityLogService),
  settings: withPersistence(settingsService),
  notifications: withPersistence(notificationService),
  backups: withPersistence(backupService),
};