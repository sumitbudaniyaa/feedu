import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartLine {
  key: string; // productId + variant + addons signature
  productId: string;
  name: string;
  variantLabel?: string;
  addonLabels: string[];
  unitPrice: number; // computed client-side for preview (server is authoritative)
  quantity: number;
}

/** Minimal restaurant snapshot kept so the cart page works without a refetch. */
export interface CartRestaurant {
  slug: string;
  name: string;
  gstPercent: number;
  inclusive: boolean;
  accent?: string;
}

/** A loyalty reward applied to the order — a free item, paid for with points. */
export interface AppliedReward {
  rewardId: string;
  title: string;
  pointsCost: number;
}

interface CartState {
  restaurant: CartRestaurant | null;
  tableId: string | null;
  /** Manually entered table (link entry without a scanned QR). */
  tableName: string | null;
  /** Path to return to the menu (slug or QR entry). */
  menuPath: string | null;
  lines: CartLine[];
  appliedReward: AppliedReward | null;
  setContext: (restaurant: CartRestaurant, tableId: string | null, menuPath: string) => void;
  setTableName: (tableName: string) => void;
  setReward: (reward: AppliedReward | null) => void;
  add: (line: Omit<CartLine, 'key' | 'quantity'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  /** Net quantity of a product across all its variant/addon lines. */
  productQty: (productId: string) => number;
  /** Increment a simple (no-options) product directly. */
  incSimple: (line: Omit<CartLine, 'key' | 'quantity'>) => void;
  decSimple: (productId: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

function lineKey(l: { productId: string; variantLabel?: string; addonLabels: string[] }) {
  return `${l.productId}|${l.variantLabel ?? ''}|${[...l.addonLabels].sort().join(',')}`;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      restaurant: null,
      tableId: null,
      tableName: null,
      menuPath: null,
      lines: [],
      appliedReward: null,
      setContext: (restaurant, tableId, menuPath) => {
        // Switching restaurants clears the cart + any applied reward (+ manual table).
        if (get().restaurant && get().restaurant?.slug !== restaurant.slug)
          set({ lines: [], appliedReward: null, tableName: null });
        set({ restaurant, tableId, menuPath });
      },
      setTableName: (tableName) => set({ tableName }),
      setReward: (reward) => set({ appliedReward: reward }),
      add: (line, qty = 1) => {
        const key = lineKey(line);
        set((state) => {
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, quantity: l.quantity + qty } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, key, quantity: qty }] };
        });
      },
      setQty: (key, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity: qty } : l)),
        })),
      productQty: (productId) =>
        get()
          .lines.filter((l) => l.productId === productId)
          .reduce((s, l) => s + l.quantity, 0),
      incSimple: (line) => get().add(line, 1),
      decSimple: (productId) => {
        const key = lineKey({ productId, addonLabels: [] });
        const existing = get().lines.find((l) => l.key === key);
        if (existing) get().setQty(key, existing.quantity - 1);
      },
      clear: () => set({ lines: [], appliedReward: null }),
      count: () => get().lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: () => get().lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    }),
    { name: 'feedo-cart' },
  ),
);
