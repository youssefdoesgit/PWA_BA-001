import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { swatch } from '@/theme/tokens';
import { addMonths, advance, endOfBudgetMonth, startOfBudgetMonth } from './date';
import { alive } from './merge';
import type {
  Budget,
  Category,
  DocketData,
  Goal,
  KevlarData,
  Recurring,
  Settings,
  Task,
  TaskStatus,
  Track,
  Transaction,
} from './types';

export const DATA_VERSION = 3;

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
    updatedAt: Date.now(),
  }));

/**
 * Opening tracks for the docket.
 *
 * Seeded rather than left empty because an empty board gives VANE nothing to
 * reason about, and because these four are what he actually said he is
 * chasing. All of them are removable.
 */
const seedTracks = (): Track[] =>
  (
    [
      ['Scholarships', '🎓', 'scholarship'],
      ['Game Dev', '🎮', 'gamedev'],
      ['Learning', '📚', 'learning'],
      ['Jams & Comps', '🏁', 'competition'],
    ] as const
  ).map(([name, icon, field], i) => ({
    id: uid(),
    name,
    icon,
    field,
    color: swatch[i % swatch.length],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

const seedSettings = (): Settings => ({
  name: '',
  currency: 'USD',
  openingBalance: 0,
  monthStartDay: 1,
  onboarded: false,
  tourDone: false,
  lockEnabled: false,
  rateOverrides: {},
  travelCurrencies: ['USD', 'EUR', 'GBP', 'TND', 'AED', 'JPY'],
  islamicMode: true,
  dismissedLeads: [],
  docketTourDone: false,
});

const emptyData = (): KevlarData => ({
  version: DATA_VERSION,
  categories: seedCategories(),
  transactions: [],
  budgets: [],
  goals: [],
  recurring: [],
  tracks: seedTracks(),
  tasks: [],
  settings: seedSettings(),
});

/* -------------------------------------------------------------------------- */
/* Store                                                                      */
/* -------------------------------------------------------------------------- */

type Actions = {
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;

  addCategory: (c: Omit<Category, 'id' | 'archived' | 'updatedAt'>) => string;
  removeCategory: (id: string) => void;

  setBudget: (categoryId: string, limit: number) => void;
  removeBudget: (id: string) => void;

  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'saved' | 'updatedAt'>) => string;
  contributeToGoal: (id: string, cents: number) => void;
  removeGoal: (id: string) => void;

  addRecurring: (r: Omit<Recurring, 'id' | 'active' | 'updatedAt'>) => string;
  removeRecurring: (id: string) => void;
  /** Logs the bill as a real transaction and rolls `nextDue` forward. */
  payRecurring: (id: string) => void;

  addTrack: (t: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  removeTrack: (id: string) => void;

  addTask: (t: Partial<Task> & { title: string }) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  /** Flips done/undone and keeps `completedAt` honest. */
  toggleTask: (id: string) => void;

  /** Waves a catalogue lead off for good. Union-merged, so it survives sync. */
  dismissLead: (leadId: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (data: KevlarData) => void;
  resetAll: () => void;

  /** Validates and loads an exported backup. */
  restore: (raw: unknown) => { ok: boolean; error?: string };
  /** Posts every recurring bill whose due date has passed. Returns how many. */
  postDueRecurring: () => number;
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
          transactions: [{ ...t, id, createdAt: Date.now(), updatedAt: Date.now() }, ...s.transactions],
        }));
        return id;
      },
      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t
          ),
        })),
      removeTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, deletedAt: Date.now(), updatedAt: Date.now() } : t
          ),
        })),

      addCategory: (c) => {
        const id = uid();
        set((s) => ({ categories: [...s.categories, { ...c, id, archived: false, updatedAt: Date.now() }] }));
        return id;
      },
      removeCategory: (id) =>
        set((s) => ({
          // Archive rather than delete, so history stays readable.
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, archived: true, updatedAt: Date.now() } : c
          ),
          budgets: s.budgets.map((b) =>
            b.categoryId === id ? { ...b, deletedAt: Date.now(), updatedAt: Date.now() } : b
          ),
        })),

      setBudget: (categoryId, limit) =>
        set((s) => {
          const existing = s.budgets.find((b) => b.categoryId === categoryId);
          if (existing) {
            return {
              budgets: s.budgets.map((b) => (b.categoryId === categoryId ? { ...b, limit, updatedAt: Date.now() } : b)),
            };
          }
          return { budgets: [...s.budgets, { id: uid(), categoryId, limit, updatedAt: Date.now() }] };
        }),
      removeBudget: (id) => set((s) => ({
          budgets: s.budgets.map((b) =>
            b.id === id ? { ...b, deletedAt: Date.now(), updatedAt: Date.now() } : b
          ),
        })),

      addGoal: (g) => {
        const id = uid();
        set((s) => ({ goals: [...s.goals, { ...g, id, saved: 0, createdAt: Date.now(), updatedAt: Date.now() }] }));
        return id;
      },
      contributeToGoal: (id, cents) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, saved: Math.max(0, g.saved + cents), updatedAt: Date.now() } : g
          ),
        })),
      removeGoal: (id) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, deletedAt: Date.now(), updatedAt: Date.now() } : g
          ),
        })),

      addRecurring: (r) => {
        const id = uid();
        set((s) => ({ recurring: [...s.recurring, { ...r, id, active: true, updatedAt: Date.now() }] }));
        return id;
      },
      removeRecurring: (id) =>
        set((s) => ({
          recurring: s.recurring.map((r) =>
            r.id === id ? { ...r, deletedAt: Date.now(), updatedAt: Date.now() } : r
          ),
        })),
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
            r.id === id
              ? { ...r, nextDue: advance(r.nextDue, r.every, r.unit), updatedAt: Date.now() }
              : r
          ),
        }));
      },

      /* --- Docket ------------------------------------------------------- */

      addTrack: (t) => {
        const id = uid();
        set((s) => ({
          tracks: [...s.tracks, { ...t, id, createdAt: Date.now(), updatedAt: Date.now() }],
        }));
        return id;
      },
      updateTrack: (id, patch) =>
        set((s) => ({
          tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)),
        })),
      removeTrack: (id) =>
        set((s) => ({
          tracks: s.tracks.map((t) =>
            t.id === id ? { ...t, deletedAt: Date.now(), updatedAt: Date.now() } : t
          ),
          // Orphan the tasks rather than deleting them. Retiring a track is a
          // change of filing, not a decision to abandon the work under it.
          tasks: s.tasks.map((t) =>
            t.trackId === id ? { ...t, trackId: undefined, updatedAt: Date.now() } : t
          ),
        })),

      addTask: (t) => {
        const id = uid();
        const task: Task = {
          status: 'open',
          priority: 0,
          steps: [],
          ...t,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return id;
      },
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)),
        })),
      removeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, deletedAt: Date.now(), updatedAt: Date.now() } : t
          ),
        })),
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const done = t.status === 'done';
            return {
              ...t,
              status: (done ? 'open' : 'done') as TaskStatus,
              completedAt: done ? undefined : Date.now(),
              updatedAt: Date.now(),
            };
          }),
        })),

      dismissLead: (leadId) => {
        const current = get().settings.dismissedLeads ?? [];
        if (current.includes(leadId)) return;
        get().updateSettings({ dismissedLeads: [...current, leadId] });
      },

      updateSettings: (patch) =>
        set((s) => {
          const now = Date.now();
          // Stamp each key individually so a merge can reconcile field by
          // field instead of picking one device's whole settings object.
          const fieldTimes = { ...(s.settings.fieldTimes ?? {}) };
          for (const k of Object.keys(patch)) fieldTimes[k] = now;
          return {
            settings: { ...s.settings, ...patch, fieldTimes, settingsUpdatedAt: now },
          };
        }),
      replaceAll: (data) => set({ ...data }),
      resetAll: () => set({ ...emptyData() }),

      restore: (raw) => {
        // A backup is the only copy, so be strict rather than forgiving —
        // half-importing a malformed file would be worse than refusing it.
        if (!raw || typeof raw !== 'object') return { ok: false, error: 'Not a KEVLAR backup.' };
        const d = raw as Partial<KevlarData>;
        const lists: (keyof KevlarData)[] = [
          'categories',
          'transactions',
          'budgets',
          'goals',
          'recurring',
        ];
        for (const key of lists) {
          if (!Array.isArray(d[key])) return { ok: false, error: `Missing or invalid "${key}".` };
        }
        if (!d.settings || typeof d.settings !== 'object') {
          return { ok: false, error: 'Missing settings.' };
        }
        if (!d.transactions!.every((t) => typeof t?.amount === 'number' && typeof t?.date === 'number')) {
          return { ok: false, error: 'Transaction records are malformed.' };
        }
        // The docket arrived after these two, so a v2 backup legitimately has
        // neither. Absent means "this predates the docket" and gets the starter
        // tracks; present-but-empty means he cleared them on purpose.
        for (const key of ['tracks', 'tasks'] as const) {
          if (d[key] !== undefined && !Array.isArray(d[key])) {
            return { ok: false, error: `Invalid "${key}".` };
          }
        }

        set({
          version: DATA_VERSION,
          categories: d.categories!,
          transactions: d.transactions!,
          budgets: d.budgets!,
          goals: d.goals!,
          recurring: d.recurring!,
          tracks: d.tracks ?? seedTracks(),
          tasks: d.tasks ?? [],
          // Merge over defaults so a backup from an older build still opens.
          settings: { ...seedSettings(), ...d.settings },
        });
        return { ok: true };
      },

      postDueRecurring: () => {
        const now = Date.now();
        const due = get().recurring.filter((r) => r.active && r.nextDue <= now);
        if (due.length === 0) return 0;

        for (const bill of due) {
          // A bill left unopened for months should post every occurrence it
          // missed, not just the most recent one.
          let cursor = bill.nextDue;
          let guard = 0;
          while (cursor <= now && guard < 240) {
            get().addTransaction({
              kind: 'expense',
              amount: bill.amount,
              categoryId: bill.categoryId,
              note: bill.name,
              date: cursor,
            });
            cursor = advance(cursor, bill.every, bill.unit);
            guard += 1;
          }
          set((s) => ({
            recurring: s.recurring.map((r) => (r.id === bill.id ? { ...r, nextDue: cursor, updatedAt: Date.now() } : r)),
          }));
        }
        return due.length;
      },
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
        tracks: s.tracks,
        tasks: s.tasks,
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
          // Storage written before the docket existed has no `tracks` key at
          // all. Spreading it over the defaults would leave the array
          // undefined, so fall back to the seeded set explicitly.
          tracks: p.tracks ?? current.tracks,
          tasks: p.tasks ?? current.tasks,
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
  const tracks = useStore((s) => s.tracks);
  const tasks = useStore((s) => s.tasks);
  const settings = useStore((s) => s.settings);

  // Screens never see tombstones; they exist purely so deletions can travel.
  return useMemo(
    () => ({
      version,
      categories: alive(categories),
      transactions: alive(transactions),
      budgets: alive(budgets),
      goals: alive(goals),
      recurring: alive(recurring),
      tracks: alive(tracks),
      tasks: alive(tasks),
      settings,
    }),
    [version, categories, transactions, budgets, goals, recurring, tracks, tasks, settings]
  );
}

/** The docket's slice. Money changes constantly; the board should not re-render for it. */
export function useDocket(): DocketData {
  const tracks = useStore((s) => s.tracks);
  const tasks = useStore((s) => s.tasks);
  const settings = useStore((s) => s.settings);

  return useMemo(
    () => ({ tracks: alive(tracks), tasks: alive(tasks), settings }),
    [tracks, tasks, settings]
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

/** Bills landing within `hours`, plus anything already overdue. */
export function dueSoon(data: KevlarData, hours = 48): Recurring[] {
  const limit = Date.now() + hours * 3600_000;
  return data.recurring
    .filter((r) => r.active && r.nextDue <= limit)
    .sort((a, b) => a.nextDue - b.nextDue);
}

export type MonthSlice = {
  /** Start of the budget month. */
  start: number;
  income: number;
  expense: number;
  net: number;
};

/**
 * The last `count` budget months, oldest first. Used for the trend charts and
 * the closing statement's comparison figures.
 */
export function monthHistory(data: KevlarData, count = 6, at = Date.now()): MonthSlice[] {
  const { monthStartDay } = data.settings;
  const out: MonthSlice[] = [];

  for (let i = count - 1; i >= 0; i--) {
    // Step back through months by landing mid-month, which avoids the
    // short-month rollover bug you get from subtracting fixed day counts.
    const probe = addMonths(at, -i);
    const start = startOfBudgetMonth(probe, monthStartDay);
    const end = endOfBudgetMonth(probe, monthStartDay);

    let income = 0;
    let expense = 0;
    for (const t of data.transactions) {
      if (t.date < start || t.date > end) continue;
      if (t.kind === 'income') income += t.amount;
      else expense += t.amount;
    }
    out.push({ start, income, expense, net: income - expense });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Docket derived                                                             */
/* -------------------------------------------------------------------------- */

export const isDone = (t: Task): boolean => t.status === 'done';

/** Everything still on the board. */
export const openTasks = (d: DocketData): Task[] => d.tasks.filter((t) => !isDone(t));

/** Past its deadline and not finished. */
export function overdueTasks(d: DocketData, at = Date.now()): Task[] {
  return openTasks(d)
    .filter((t) => t.due !== undefined && t.due < at)
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
}

/** Lands inside the window and is not finished. Excludes anything already overdue. */
export function dueWithin(d: DocketData, hours: number, at = Date.now()): Task[] {
  const limit = at + hours * 3600_000;
  return openTasks(d)
    .filter((t) => t.due !== undefined && t.due >= at && t.due <= limit)
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
}

/** Checklist completion, 0..1. A task with no steps reports 0 rather than 1. */
export function taskProgress(t: Task): number {
  if (t.steps.length === 0) return isDone(t) ? 1 : 0;
  return t.steps.filter((s) => s.done).length / t.steps.length;
}

/**
 * Board order: what will bite you first, first.
 *
 * Deadlines outrank priority — a critical task due next month genuinely is
 * less urgent than a routine one due tomorrow, and pretending otherwise buries
 * the thing that is about to close.
 */
export function sortTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;
    if ((a.due !== undefined) !== (b.due !== undefined)) return a.due !== undefined ? -1 : 1;
    if (a.due !== undefined && b.due !== undefined && a.due !== b.due) return a.due - b.due;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return b.createdAt - a.createdAt;
  });
}

/** Tasks finished since `since`. Feeds VANE's read on momentum. */
export function completedSince(d: DocketData, since: number): Task[] {
  return d.tasks.filter((t) => isDone(t) && (t.completedAt ?? 0) >= since);
}

/** Open tasks per track, so a neglected area is visible at a glance. */
export function loadByTrack(d: DocketData): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of openTasks(d)) {
    if (!t.trackId) continue;
    out.set(t.trackId, (out.get(t.trackId) ?? 0) + 1);
  }
  return out;
}

/** Spend per category for an arbitrary budget month. */
export function spendByCategoryIn(data: KevlarData, at: number): Map<string, number> {
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
