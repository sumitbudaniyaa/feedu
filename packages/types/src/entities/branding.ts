/** Accent keys must mirror @feedo/config tokens `accents`. */
export const accentKeys = ['emerald', 'violet', 'blue', 'amber', 'rose', 'slate'] as const;
export type AccentKey = (typeof accentKeys)[number];
