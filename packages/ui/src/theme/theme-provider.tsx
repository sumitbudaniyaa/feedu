import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';
export type AccentKey = 'emerald' | 'violet' | 'blue' | 'amber' | 'rose' | 'slate';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  accent: AccentKey;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  setAccent: (accent: AccentKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(resolved: ResolvedTheme, accent: AccentKey) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('light-scheme', resolved === 'light');
  root.setAttribute('data-accent', accent);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Namespaced storage key so each app can persist independently. */
  storageKey?: string;
  defaultMode?: ThemeMode;
  defaultAccent?: AccentKey;
}

export function ThemeProvider({
  children,
  storageKey = 'feedo-theme',
  defaultMode = 'dark',
  defaultAccent = 'violet',
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return defaultMode;
    return (localStorage.getItem(`${storageKey}-mode`) as ThemeMode) || defaultMode;
  });
  const [accent, setAccentState] = useState<AccentKey>(() => {
    if (typeof window === 'undefined') return defaultAccent;
    return (localStorage.getItem(`${storageKey}-accent`) as AccentKey) || defaultAccent;
  });

  const resolved: ResolvedTheme = mode === 'system' ? getSystemTheme() : mode;

  useEffect(() => {
    applyTheme(resolved, accent);
  }, [resolved, accent]);

  // React to OS theme changes while in "system" mode.
  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme(getSystemTheme(), accent);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode, accent]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      localStorage.setItem(`${storageKey}-mode`, next);
    },
    [storageKey],
  );

  const setAccent = useCallback(
    (next: AccentKey) => {
      setAccentState(next);
      localStorage.setItem(`${storageKey}-accent`, next);
    },
    [storageKey],
  );

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  const value = useMemo(
    () => ({ mode, resolved, accent, setMode, toggle, setAccent }),
    [mode, resolved, accent, setMode, toggle, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
