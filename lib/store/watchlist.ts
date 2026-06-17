/**
 * Zustand store for watchlist (client-side only).
 * Persisted to localStorage so it survives page reloads.
 *
 * Note: localStorage is only available in the browser. This store is
 * intentionally NOT used in any server component or API route.
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WatchlistItem {
  ticker: string;
  addedAt: number;
  notes: string;
}

interface WatchlistStore {
  items: WatchlistItem[];
  add: (ticker: string) => void;
  remove: (ticker: string) => void;
  toggle: (ticker: string) => void;
  updateNotes: (ticker: string, notes: string) => void;
  has: (ticker: string) => boolean;
  clear: () => void;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      add: (ticker) => {
        if (get().has(ticker)) return;
        set((s) => ({
          items: [...s.items, { ticker: ticker.toUpperCase(), addedAt: Date.now(), notes: '' }],
        }));
      },

      remove: (ticker) =>
        set((s) => ({ items: s.items.filter((i) => i.ticker !== ticker.toUpperCase()) })),

      toggle: (ticker) => {
        if (get().has(ticker)) get().remove(ticker);
        else get().add(ticker);
      },

      updateNotes: (ticker, notes) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.ticker === ticker.toUpperCase() ? { ...i, notes } : i
          ),
        })),

      has: (ticker) => get().items.some((i) => i.ticker === ticker.toUpperCase()),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'momentum-monster-watchlist',
      version: 1,
    }
  )
);
