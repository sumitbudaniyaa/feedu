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
  'future',
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

export const FEATURE_CATALOG: FeatureDef[] = [
  // Core (always on)
  { key: 'qr_ordering', label: 'QR Ordering', group: 'core', defaultPrice: 0, surfaces: ['customer'], core: true },
  { key: 'orders', label: 'Orders', group: 'core', defaultPrice: 0, surfaces: ['admin'], core: true },
  { key: 'tables', label: 'Tables & QR', group: 'core', defaultPrice: 0, surfaces: ['admin'], core: true },
  { key: 'inventory', label: 'Inventory', group: 'core', defaultPrice: 0, surfaces: ['admin'], core: true },
  { key: 'kitchen_display', label: 'Kitchen Display', group: 'core', defaultPrice: 0, surfaces: ['kitchen'] },

  // Operations
  { key: 'waiter_system', label: 'Waiter System', group: 'operations', defaultPrice: 800, surfaces: ['waiter', 'customer'] },
  { key: 'qr_management', label: 'QR Management', group: 'operations', defaultPrice: 200, surfaces: ['admin'] },
  { key: 'support_chat', label: 'Support Chat', group: 'operations', defaultPrice: 200, surfaces: ['admin'] },
  { key: 'customer_analytics', label: 'Customer Analytics', group: 'operations', defaultPrice: 500, surfaces: ['admin'] },

  // Analytics
  { key: 'analytics', label: 'Analytics', group: 'analytics', defaultPrice: 1000, surfaces: ['admin'] },
  { key: 'branch_comparison', label: 'Branch Comparison', group: 'analytics', defaultPrice: 700, surfaces: ['admin'] },
  { key: 'advanced_reports', label: 'Advanced Reports', group: 'analytics', defaultPrice: 1200, surfaces: ['admin'] },

  // Loyalty
  { key: 'loyalty', label: 'Loyalty', group: 'loyalty', defaultPrice: 500, surfaces: ['admin', 'customer'] },
  { key: 'rewards', label: 'Rewards', group: 'loyalty', defaultPrice: 400, surfaces: ['admin', 'customer'] },
  { key: 'points_expiry', label: 'Points Expiry', group: 'loyalty', defaultPrice: 100, surfaces: ['admin'] },

  // Payments
  { key: 'online_payments', label: 'Online Payments', group: 'payments', defaultPrice: 600, surfaces: ['customer'] },
  { key: 'multi_gateway_support', label: 'Multi-Gateway', group: 'payments', defaultPrice: 400, surfaces: ['admin'] },

  // Branding
  { key: 'custom_branding', label: 'Custom Branding', group: 'branding', defaultPrice: 500, surfaces: ['admin'] },

  // Enterprise
  { key: 'multi_branch', label: 'Multi Branch', group: 'enterprise', defaultPrice: 2000, surfaces: ['admin'] },
  { key: 'whatsapp_notifications', label: 'WhatsApp Notifications', group: 'enterprise', defaultPrice: 1500, surfaces: ['admin'] },
  { key: 'crm', label: 'CRM', group: 'enterprise', defaultPrice: 1500, surfaces: ['admin'] },
  { key: 'ai_analytics', label: 'AI Analytics', group: 'enterprise', defaultPrice: 2500, surfaces: ['admin'] },
  { key: 'priority_support', label: 'Priority Support', group: 'enterprise', defaultPrice: 1000, surfaces: ['admin'] },

  // Future
  { key: 'printer_support', label: 'Printer Support', group: 'future', defaultPrice: 300, surfaces: ['admin'] },
  { key: 'pos_integrations', label: 'POS Integrations', group: 'future', defaultPrice: 800, surfaces: ['admin'] },
  { key: 'zomato_sync', label: 'Zomato Sync', group: 'future', defaultPrice: 700, surfaces: ['admin'] },
  { key: 'swiggy_sync', label: 'Swiggy Sync', group: 'future', defaultPrice: 700, surfaces: ['admin'] },
  { key: 'ondc', label: 'ONDC', group: 'future', defaultPrice: 700, surfaces: ['admin'] },
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
