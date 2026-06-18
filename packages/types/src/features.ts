/**
 * Dynamic feature catalog for feature-based pricing & provisioning.
 *
 * A brand's subscription enables a set of these feature keys; the super-admin
 * sets a custom price per feature at onboarding. The same catalog drives backend
 * enforcement (`requireFeature`) and frontend visibility across every app.
 */

export const FEATURE_GROUPS = [
  'core',
  'operations',
  'analytics',
  'loyalty',
  'payments',
  'branding',
  'enterprise',
] as const;
export type FeatureGroup = (typeof FEATURE_GROUPS)[number];

/** Which app a feature primarily affects (drives where it's gated). */
export type FeatureSurface = 'admin' | 'customer' | 'kitchen' | 'waiter';

export interface FeatureDef {
  key: string;
  label: string;
  group: FeatureGroup;
  /** Suggested per-cycle price (₹); super-admin can override at onboarding. */
  defaultPrice: number;
  surfaces: FeatureSurface[];
  /** Core features are always on and can't be disabled. */
  core?: boolean;
}

// Only features that actually exist in the app today.
export const FEATURE_CATALOG: FeatureDef[] = [
  // Core (always on)
  { key: 'qr_ordering', label: 'QR Ordering', group: 'core', defaultPrice: 0, surfaces: ['customer'], core: true },
  { key: 'orders', label: 'Orders', group: 'core', defaultPrice: 0, surfaces: ['admin'], core: true },
  { key: 'tables', label: 'Tables & QR', group: 'core', defaultPrice: 0, surfaces: ['admin'], core: true },
  { key: 'inventory', label: 'Inventory & Menu', group: 'core', defaultPrice: 0, surfaces: ['admin'], core: true },

  // Operations
  { key: 'kitchen_display', label: 'Kitchen Display (KDS)', group: 'operations', defaultPrice: 500, surfaces: ['kitchen'] },
  { key: 'waiter_system', label: 'Waiter App & Call-Waiter', group: 'operations', defaultPrice: 800, surfaces: ['waiter', 'customer'] },
  { key: 'support_chat', label: 'Support Tickets', group: 'operations', defaultPrice: 200, surfaces: ['admin'] },
  { key: 'customer_analytics', label: 'Customer Analytics', group: 'operations', defaultPrice: 500, surfaces: ['admin'] },

  // Analytics
  { key: 'analytics', label: 'Analytics Dashboard', group: 'analytics', defaultPrice: 1000, surfaces: ['admin'] },
  { key: 'branch_comparison', label: 'Branch Comparison', group: 'analytics', defaultPrice: 700, surfaces: ['admin'] },

  // Loyalty
  { key: 'loyalty', label: 'Loyalty Programs', group: 'loyalty', defaultPrice: 500, surfaces: ['admin', 'customer'] },
  { key: 'rewards', label: 'Rewards', group: 'loyalty', defaultPrice: 400, surfaces: ['admin', 'customer'] },
  { key: 'points_expiry', label: 'Points Expiry', group: 'loyalty', defaultPrice: 100, surfaces: ['admin'] },

  // Payments
  { key: 'online_payments', label: 'Online Payments (Razorpay)', group: 'payments', defaultPrice: 600, surfaces: ['customer'] },

  // Branding
  { key: 'custom_branding', label: 'Custom Branding', group: 'branding', defaultPrice: 500, surfaces: ['admin'] },

  // Enterprise
  { key: 'multi_branch', label: 'Multi Branch', group: 'enterprise', defaultPrice: 2000, surfaces: ['admin'] },
];

export const FEATURE_KEYS = FEATURE_CATALOG.map((f) => f.key);
export type FeatureKey = (typeof FEATURE_CATALOG)[number]['key'];

/** Always-on features that can't be turned off (the product floor). */
export const CORE_FEATURE_KEYS = FEATURE_CATALOG.filter((f) => f.core).map((f) => f.key);

export const FEATURE_BY_KEY: Record<string, FeatureDef> = Object.fromEntries(
  FEATURE_CATALOG.map((f) => [f.key, f]),
);

/** Usage / capacity limits a subscription can cap. `null` = unlimited. */
export const LIMIT_KEYS = [
  'max_branches',
  'max_staff',
  'max_tables',
  'max_products',
  'max_orders_monthly',
  'max_loyalty_rewards',
  'max_storage',
] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];
export type SubscriptionLimits = Partial<Record<LimitKey, number | null>>;

export interface FeatureCharge {
  key: string;
  price: number;
}
