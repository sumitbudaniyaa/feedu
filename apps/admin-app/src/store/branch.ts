import { useSyncExternalStore } from 'react';

/**
 * Active branch for the admin app. Persisted to localStorage and read
 * synchronously by ApiClient (sent as the `x-branch-id` tenant header).
 * Dependency-free store so we don't pull zustand into this app.
 */
const KEY = 'feedu-admin-branch';
let current: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
const listeners = new Set<() => void>();

export function getActiveBranchId(): string | undefined {
  return current ?? undefined;
}

export function setActiveBranchId(id: string | null) {
  current = id;
  if (typeof localStorage !== 'undefined') {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  }
  listeners.forEach((l) => l());
}

export function useActiveBranchId(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}
