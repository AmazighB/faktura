import type { Expense } from '@/types';
import type { ExpenseService, ListParams } from '@/services/types';
import { mockExpenses } from '@/mocks/data';
import { delay, uid, matchesSearch, clone } from '@/mocks/helpers';

class MockExpenseService implements ExpenseService {
  private expenses: Expense[] = clone(mockExpenses);

  async list(params?: ListParams): Promise<Expense[]> {
    let result = this.expenses;
    if (params?.search) {
      const s = params.search;
      result = result.filter(
        (e) => matchesSearch(e.description, s) || matchesSearch(e.supplierName, s),
      );
    }
    return delay([...result].sort((a, b) => b.date.localeCompare(a.date)));
  }

  async create(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const expense: Expense = { ...data, id: uid('e'), createdAt: new Date().toISOString() };
    this.expenses.unshift(expense);
    return delay(expense);
  }

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const idx = this.expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Dépense introuvable');
    this.expenses[idx] = { ...this.expenses[idx], ...data };
    return delay(this.expenses[idx]);
  }

  async remove(id: string): Promise<void> {
    this.expenses = this.expenses.filter((e) => e.id !== id);
    return delay(undefined);
  }
}

export const expenseService = new MockExpenseService();
