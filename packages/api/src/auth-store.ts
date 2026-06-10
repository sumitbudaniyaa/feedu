import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, PublicUser } from '@feedo/types';

interface AuthState {
  user: PublicUser | null;
  tokens: AuthTokens | null;
  setSession: (user: PublicUser, tokens: AuthTokens) => void;
  setTokens: (tokens: AuthTokens) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

/**
 * Shared auth store. `storeName` is namespaced per app at creation so each
 * frontend persists its own session independently in localStorage.
 */
export function createAuthStore(storeName: string) {
  return create<AuthState>()(
    persist(
      (set, get) => ({
        user: null,
        tokens: null,
        setSession: (user, tokens) => set({ user, tokens }),
        setTokens: (tokens) => set({ tokens }),
        clear: () => set({ user: null, tokens: null }),
        isAuthenticated: () => Boolean(get().tokens?.accessToken),
      }),
      { name: storeName },
    ),
  );
}

export type AuthStore = ReturnType<typeof createAuthStore>;
