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
}));
