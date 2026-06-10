import { create } from 'zustand';

export interface CartLine {
  key: string; // productId + variant + addons signature
  productId: string;
  name: string;
  variantLabel?: string;
  addonLabels: string[];
  unitPrice: number; // computed client-side for preview (server is authoritative)
  quantity: number;
}

interface CartState {
  /** Restaurant slug the cart belongs to; clears if you switch restaurants. */
  slug: string | null;
  tableId: string | null;
  lines: CartLine[];
  setContext: (slug: string, tableId: string | null) => void;
  add: (line: Omit<CartLine, 'key' | 'quantity'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

function lineKey(l: { productId: string; variantLabel?: string; addonLabels: string[] }) {
  return `${l.productId}|${l.variantLabel ?? ''}|${[...l.addonLabels].sort().join(',')}`;
}

export const useCart = create<CartState>((set, get) => ({
  slug: null,
  tableId: null,
  setContext: (slug, tableId) => {
    if (get().slug && get().slug !== slug) set({ lines: [] }); // switched restaurant
    set({ slug, tableId });
  },
  lines: [],
  add: (line, qty = 1) => {
    const key = lineKey(line);
    set((state) => {
      const existing = state.lines.find((l) => l.key === key);
      if (existing) {
        return {
          lines: state.lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + qty } : l)),
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
  clear: () => set({ lines: [] }),
  count: () => get().lines.reduce((s, l) => s + l.quantity, 0),
  subtotal: () => get().lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
}));
