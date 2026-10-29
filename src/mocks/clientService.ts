import type { Client } from '@/types';
import type { ClientService, ListParams } from '@/services/types';
import { mockClients } from '@/mocks/data';
import { invoiceService } from '@/mocks/invoiceService';
import { quoteService } from '@/mocks/quoteService';
import { delay, uid, matchesSearch, persistentStore } from '@/mocks/helpers';

class MockClientService implements ClientService {
  private clientsStore = persistentStore<Client>('clients', mockClients);
  private get clients(): Client[] { return this.clientsStore.items; }
  private set clients(v: Client[]) { this.clientsStore.items = v; }

  async list(params?: ListParams): Promise<Client[]> {
    let result = this.clients;
    if (params?.search) {
      const s = params.search;
      result = result.filter(
        (c) =>
          matchesSearch(c.name, s) ||
          matchesSearch(c.phone, s) ||
          matchesSearch(c.email, s) ||
          matchesSearch(c.wilaya, s),
      );
    }
    return delay([...result].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async get(id: string): Promise<Client | null> {
    return delay(this.clients.find((c) => c.id === id) ?? null);
  }

  async create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt'>): Promise<Client> {
    const now = new Date().toISOString();
    const client: Client = {
      ...data,
      id: uid('c'),
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };
    this.clients.unshift(client);
    return delay(client);
  }

  async update(id: string, data: Partial<Client>): Promise<Client> {
    const idx = this.clients.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Client introuvable');
    this.clients[idx] = { ...this.clients[idx], ...data, updatedAt: new Date().toISOString() };
    return delay(this.clients[idx]);
  }

  async remove(id: string): Promise<void> {
    const hasDocuments =
      invoiceService._internalList().some((i) => i.clientId === id) ||
      quoteService._internalList().some((q) => q.clientId === id);
    if (hasDocuments) {
      throw new Error('Ce client a des factures ou des devis : archivez-le plutôt que de le supprimer.');
    }
    this.clients = this.clients.filter((c) => c.id !== id);
    return delay(undefined);
  }
}

export const clientService = new MockClientService();