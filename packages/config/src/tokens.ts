/**
 * Feedo design tokens — single source of truth for color values.
 *
 * The Tailwind preset consumes CSS variables (defined in @feedo/ui globals.css)
 * so themes can switch at runtime. These raw values document the intended
 * palette and are useful for non-CSS contexts (charts, emails, canvas, QR).
 */

export const palette = {
  dark: {
    background: '#090909',
    surface: '#111111',
    border: '#1A1A1A',
    text: '#F5F5F5',
    textMuted: '#9CA3AF',
  },
  light: {
    background: '#FFFFFF',
    surface: '#FAFAFA',
    border: '#ECECEC',
    text: '#0A0A0A',
    textMuted: '#6B7280',
  },
} as const;

/** Muted, premium accent options exposed in onboarding/branding. */
export const accents = {
  emerald: '#10B981',
  violet: '#8B5CF6',
  blue: '#3B82F6',
  amber: '#F59E0B',
  rose: '#F43F5E',
  slate: '#64748B',
} as const;

/** Recharts-friendly categorical series (muted, calm). */
export const chartSeries = ['#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#F43F5E', '#64748B'] as const;

export type AccentKey = keyof typeof accents;
export type ThemeMode = 'dark' | 'light';
