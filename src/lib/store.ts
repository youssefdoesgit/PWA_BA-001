import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { swatch } from '@/theme/tokens';
import { advance, endOfBudgetMonth, startOfBudgetMonth } from './date';
import type {
  Budget,
  Category,
  Goal,
  KevlarData,
  Recurring,
  Settings,
  Transaction,
} from './types';

export const DATA_VERSION = 2;

const uid = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* -------------------------------------------------------------------------- */
/* Seed                                                                       */
/* -------------------------------------------------------------------------- */

const seedCategories = (): Category[] =>
  (
    [
      ['Food', '🍜', 'expense'],
      ['Groceries', '🛒', 'expense'],
      ['Transport', '🚗', 'expense'],
      ['Bills', '🏠', 'expense'],
      ['Shopping', '🛍️', 'expense'],
      ['Fun', '🎮', 'expense'],
      ['Health', '💊', 'expense'],
      ['Subs', '📺', 'expense'],
      ['Other', '📦', 'expense'],
      ['Salary', '💼', 'income'],
      ['Freelance', '💻', 'income'],
      ['Gifts', '🎁', 'income'],
    ] as const
  ).map(([name, icon, kind], i) => ({
    id: uid(),
    name,
    icon,
    kind,
    color: swatch[i % swatch.length],
    archived: false,
  }));

const seedSettings = (): Settings => ({
  name: '',
  currency: 'USD',
  openingBalance: 0,
  monthStartDay: 1,
  onboarded: false,
  tourDone: false,
  rateOverrides: {},
  travelCurrencies: ['USD', 'EUR', 'GBP', 'TND', 'AED', 'JPY'],
  islamicMode: true,
});

const emptyData = (): KevlarData => ({
  version: DATA_VERSION,
  categories: seedCategories(),
  transactions: [],
  budgets: [],
  goals: [],
  recurring: [],
  settings: seedSettings(),
});

/* -------------------------------------------------------------------------- */
/* Store                                                                      */
/* -------------------------------------------------------------------------- */

type Actions = {
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => string;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;

  addCategory: (c: Omit<Category, 'id' | 'archived'>) => string;
  removeCategory: (id: string) => void;

  setBudget: (categoryId: string, limit: number) => void;
  removeBudget: (id: string) => void;

  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'saved'>) => string;
  contributeToGoal: (id: string, cents: number) => void;
  removeGoal: (id: string) => void;

  addRecurring: (r: Omit<Recurring, 'id' | 'active'>) => string;
  removeRecurring: (id: string) => void;
  /** Logs the bill as a real transaction and rolls `nextDue` forward. */
  payRecurring: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (data: KevlarData) => void;
  resetAll: () => void;
};

export type KevlarStore = KevlarData & { hydrated: boolean } & Actions;

export const useStore = create<KevlarStore>()(
  persist(
    (set, get) => ({
      ...emptyData(),
      hydrated: false,

      addTransaction: (t) => {
        const id = uid();
        set((s) => ({
          transactions: [{ ...t, id, createdAt: Date.now() }, ...s.transactions],
        }));
        return id;
      },
      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      addCategory: (c) => {
        const id = uid();
        set((s) => ({ categories: [...s.categories, { ...c, id, archived: false }] }));
        return id;
      },
      removeCategory: (id) =>
        set((s) => ({
          // Archive rather than delete, so history stays readable.
          categories: s.categories.map((c) => (c.id === id ? { ...c, archived: true } : c)),
          budgets: s.budgets.filter((b) => b.categoryId !== id),
        })),

      setBudget: (categoryId, limit) =>
        set((s) => {
          const existing = s.budgets.find((b) => b.categoryId === categoryId);
          if (existing) {
            return {
              budgets: s.budgets.map((b) => (b.categoryId === categoryId ? { ...b, limit } : b)),
            };
          }
          return { budgets: [...s.budgets, { id: uid(), categoryId, limit }] };
        }),
      removeBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

      addGoal: (g) => {
        const id = uid();
        set((s) => ({ goals: [...s.goals, { ...g, id, saved: 0, createdAt: Date.now() }] }));
        return id;
      },
      contributeToGoal: (id, cents) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, saved: Math.max(0, g.saved + cents) } : g
          ),
        })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      addRecurring: (r) => {
        const id = uid();
        set((s) => ({ recurring: [...s.recurring, { ...r, id, active: true }] }));
        return id;
      },
      removeRecurring: (id) =>
        set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) })),
      payRecurring: (id) => {
        const bill = get().recurring.find((r) => r.id === id);
        if (!bill) return;
        get().addTransaction({
          kind: 'expense',
          amount: bill.amount,
          categoryId: bill.categoryId,
          note: bill.name,
          date: bill.nextDue,
        });
        set((s) => ({
          recurring: s.recurring.map((r) =>
            r.id === id ? { ...r, nextDue: advance(r.nextDue, r.every, r.unit) } : r
          ),
        }));
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      replaceAll: (data) => set({ ...data }),
      resetAll: () => set({ ...emptyData() }),
    }),
    {
      name: 'kevlar-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): KevlarData => ({
        version: s.version,
        categories: s.categories,
        transactions: s.transactions,
        budgets: s.budgets,
        goals: s.goals,
        recurring: s.recurring,
        settings: s.settings,
      }),
      /*
       * Shallow-merging drops any settings key added after the user's data was
       * written, leaving `undefined` where the UI expects a value.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<KevlarData>;
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        };
      },
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    }
  )
);

/**
 * Stable view of the data half of the store.
 *
 * A bare `useStore()` hands React a snapshot it can't prove is unchanged,
 * which trips the "getSnapshot should be cached" warning on every screen.
 */
export function useData(): KevlarData {
  const version = useStore((s) => s.version);
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const goals = useStore((s) => s.goals);
  const recurring = useStore((s) => s.recurring);
  const settings = useStore((s) => s.settings);

  return useMemo(
    () => ({ version, categories, transactions, budgets, goals, recurring, settings }),
    [version, categories, transactions, budgets, goals, recurring, settings]
  );
}

/* -------------------------------------------------------------------------- */
/* Derived                                                                    */
/* -------------------------------------------------------------------------- */

export function balance(data: KevlarData): number {
  return data.transactions.reduce(
    (sum, t) => sum + (t.kind === 'income' ? t.amount : -t.amount),
    data.settings.openingBalance
  );
}

export type MonthTotals = { income: number; expense: number; net: number };

export function monthTotals(data: KevlarData, at = Date.now()): MonthTotals {
  const start = startOfBudgetMonth(at, data.settings.monthStartDay);
  const end = endOfBudgetMonth(at, data.settings.monthStartDay);
  let income = 0;
  let expense = 0;
  for (const t of data.transactions) {
    if (t.date < start || t.date > end) continue;
    if (t.kind === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

/** Total spent per category within the current budget month. */
export function spendByCategory(data: KevlarData, at = Date.now()): Map<string, number> {
  const start = startOfBudgetMonth(at, data.settings.monthStartDay);
  const end = endOfBudgetMonth(at, data.settings.monthStartDay);
  const out = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.kind !== 'expense' || !t.categoryId) continue;
    if (t.date < start || t.date > end) continue;
    out.set(t.categoryId, (out.get(t.categoryId) ?? 0) + t.amount);
  }
  return out;
}
