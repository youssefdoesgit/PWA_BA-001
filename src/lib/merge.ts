/**
 * Three-way-ish merge for two copies of the ledger.
 *
 * Both devices edit freely offline, so this has to reconcile without a server
 * arbitrating. The rules are deliberately boring:
 *
 *   · records are unioned by id, never matched by content
 *   · when both sides have a record, the newer `updatedAt` wins outright
 *   · a tombstone is just another record, so deletions propagate like edits
 *
 * Boring is the point. Anything cleverer would occasionally resurrect a
 * deleted entry or silently drop one, and this is a ledger.
 */

import type { Budget, Category, Goal, KevlarData, Recurring, Settings, Transaction } from './types';

type WithId = { id: string; updatedAt: number; deletedAt?: number };

function mergeList<T extends WithId>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();

  for (const rec of local) byId.set(rec.id, rec);

  for (const rec of remote) {
    const mine = byId.get(rec.id);
    if (!mine) {
      byId.set(rec.id, rec);
      continue;
    }
    // Ties go to the remote copy: arbitrary, but it has to be deterministic
    // or the two devices would flip-flop forever.
    if ((rec.updatedAt ?? 0) >= (mine.updatedAt ?? 0)) byId.set(rec.id, rec);
  }

  return [...byId.values()];
}

function mergeSettings(local: Settings, remote: Settings): Settings {
  const newer = (remote.settingsUpdatedAt ?? 0) > (local.settingsUpdatedAt ?? 0) ? remote : local;

  return {
    ...newer,
    // Backend config and the passphrase check are per-device concerns — never
    // let a merge overwrite how this device reaches the server.
    syncUrl: local.syncUrl,
    syncKey: local.syncKey,
    passphraseCheck: local.passphraseCheck,
    syncedAt: local.syncedAt,
    // Whether *this* device has seen the tutorial is also local.
    onboarded: local.onboarded,
    tourDone: local.tourDone,
  };
}

export function mergeData(local: KevlarData, remote: KevlarData): KevlarData {
  return {
    version: Math.max(local.version ?? 1, remote.version ?? 1),
    categories: mergeList<Category>(local.categories, remote.categories),
    transactions: mergeList<Transaction>(local.transactions, remote.transactions),
    budgets: mergeList<Budget>(local.budgets, remote.budgets),
    goals: mergeList<Goal>(local.goals, remote.goals),
    recurring: mergeList<Recurring>(local.recurring, remote.recurring),
    settings: mergeSettings(local.settings, remote.settings),
  };
}

/** Live records only — tombstones are an implementation detail of sync. */
export const alive = <T extends { deletedAt?: number }>(list: T[]): T[] =>
  list.filter((r) => !r.deletedAt);

/**
 * Drops tombstones that everyone has certainly seen by now.
 *
 * Without this the ledger grows forever. A year is far longer than any
 * realistic gap between two devices syncing.
 */
export function pruneTombstones(data: KevlarData, olderThanMs = 365 * 86_400_000): KevlarData {
  const cutoff = Date.now() - olderThanMs;
  const keep = <T extends { deletedAt?: number }>(list: T[]) =>
    list.filter((r) => !r.deletedAt || r.deletedAt > cutoff);

  return {
    ...data,
    categories: keep(data.categories),
    transactions: keep(data.transactions),
    budgets: keep(data.budgets),
    goals: keep(data.goals),
    recurring: keep(data.recurring),
  };
}
