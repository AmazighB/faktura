import type { Product } from '@/types';
import type { ProductService, ListParams } from '@/services/types';
import { mockProducts } from '@/mocks/data';
import { delay, uid, matchesSearch, clone } from '@/mocks/helpers';

class MockProductService implements ProductService {
  private products: Product[] = clone(mockProducts);

  async list(params?: ListParams): Promise<Product[]> {
    let result = this.products;
    if (params?.search) {
      const s = params.search;
      result = result.filter(
        (p) => matchesSearch(p.name, s) || matchesSearch(p.reference, s) || matchesSearch(p.category, s),
      );
    }
    return delay([...result].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async get(id: string): Promise<Product | null> {
    return delay(this.products.find((p) => p.id === id) ?? null);
  }

  async create(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    const product: Product = { ...data, id: uid('p'), createdAt: new Date().toISOString() };
    this.products.unshift(product);
    return delay(product);
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Produit introuvable');
    this.products[idx] = { ...this.products[idx], ...data };
    return delay(this.products[idx]);
  }

  async remove(id: string): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
    return delay(undefined);
  }
}

export const productService = new MockProductService();
