import type { Supplier } from '@/types';
import type { SupplierService, ListParams } from '@/services/types';
import { mockSuppliers } from '@/mocks/data';
import { delay, uid, matchesSearch, persistentStore } from '@/mocks/helpers';

class MockSupplierService implements SupplierService {
  private suppliersStore = persistentStore<Supplier>('suppliers', mockSuppliers);
  private get suppliers(): Supplier[] { return this.suppliersStore.items; }
  private set suppliers(v: Supplier[]) { this.suppliersStore.items = v; }

  async list(params?: ListParams): Promise<Supplier[]> {
    let result = this.suppliers;
    if (params?.search) {
      const s = params.search;
      result = result.filter((sup) => matchesSearch(sup.name, s) || matchesSearch(sup.phone, s));
    }
    return delay([...result].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async get(id: string): Promise<Supplier | null> {
    return delay(this.suppliers.find((s) => s.id === id) ?? null);
  }

  async create(data: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    const supplier: Supplier = { ...data, id: uid('s'), createdAt: new Date().toISOString() };
    this.suppliers.unshift(supplier);
    return delay(supplier);
  }

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const idx = this.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Fournisseur introuvable');
    this.suppliers[idx] = { ...this.suppliers[idx], ...data };
    return delay(this.suppliers[idx]);
  }

  async remove(id: string): Promise<void> {
    this.suppliers = this.suppliers.filter((s) => s.id !== id);
    return delay(undefined);
  }
}

export const supplierService = new MockSupplierService();