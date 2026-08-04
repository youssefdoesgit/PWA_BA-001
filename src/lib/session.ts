import { create } from 'zustand';

import type { Mood } from '@/components/ui/agency';

/**
 * Ephemeral UI state — deliberately not persisted.
 *
 * Undo prompts, BRIC's transient remarks and the update banner should all
 * vanish when the app closes. Putting them in the main store would write them
 * to disk and resurrect a stale "undo" on next launch.
 */

export type Toast = {
  id: number;
  text: string;
  mood: Mood;
  /** Present only when the action can actually be reversed. */
  undo?: () => void;
};

type Session = {
  toast: Toast | null;
  /** BRIC says something. `undo` makes it reversible. */
  say: (text: string, opts?: { mood?: Mood; undo?: () => void }) => void;
  dismiss: () => void;

  updateReady: boolean;
  setUpdateReady: (v: boolean) => void;

  /** True while a sync is in flight, so nothing starts a second one. */
  syncing: boolean;
  setSyncing: (v: boolean) => void;
  lastSyncError: string | null;
  setLastSyncError: (v: string | null) => void;

  /** Cleared on every cold start, so the lock is asked for each launch. */
  unlocked: boolean;
  setUnlocked: (v: boolean) => void;

  /**
   * The mainframe's boot sequence has played this launch.
   *
   * Session state rather than persisted: it should run once when the app
   * opens, and not again every time he backs out of a subsystem.
   */
  booted: boolean;
  setBooted: (v: boolean) => void;
};

let counter = 0;

export const useSession = create<Session>()((set) => ({
  toast: null,
  say: (text, opts = {}) =>
    set({
      toast: { id: ++counter, text, mood: opts.mood ?? 'idle', undo: opts.undo },
    }),
  dismiss: () => set({ toast: null }),

  updateReady: false,
  setUpdateReady: (v) => set({ updateReady: v }),

  syncing: false,
  setSyncing: (v) => set({ syncing: v }),
  lastSyncError: null,
  setLastSyncError: (v) => set({ lastSyncError: v }),

  unlocked: false,
  setUnlocked: (v) => set({ unlocked: v }),

  booted: false,
  setBooted: (v) => set({ booted: v }),
}));
