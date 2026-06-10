import { useMutation, useQuery } from '@tanstack/react-query';
import type { Category, CreateOrderInput, Order, Product, Restaurant, Section, Table } from '@feedo/types';
import type { ApiClient } from '../client.js';

export interface MenuPayload {
  restaurant: Restaurant;
  table?: Table;
  categories: Category[];
  products: Product[];
  sections: Section[];
}

/** Customer-facing (public) hooks — no auth required. */
export function createPublicHooks(client: ApiClient) {
  return {
    /** Load a restaurant's live menu by slug. */
    useMenuBySlug(slug?: string) {
      return useQuery({
        queryKey: ['public', 'menu', slug],
        queryFn: () => client.get<MenuPayload>(`/public/r/${slug}`),
        enabled: Boolean(slug),
      });
    },
    /** Resolve a scanned QR token → restaurant + table + menu. */
    useMenuByQr(qrToken?: string) {
      return useQuery({
        queryKey: ['public', 'qr', qrToken],
        queryFn: () => client.get<MenuPayload>(`/public/qr/${qrToken}`),
        enabled: Boolean(qrToken),
      });
    },
    /** Live order tracking. Poll until terminal status. */
    useTrackOrder(orderId?: string) {
      return useQuery({
        queryKey: ['public', 'order', orderId],
        queryFn: () => client.get<Order>(`/public/orders/${orderId}`),
        enabled: Boolean(orderId),
        refetchInterval: (q) => {
          const status = q.state.data?.status;
          return status && ['completed', 'cancelled', 'refunded', 'served'].includes(status)
            ? false
            : 5000;
        },
      });
    },
    usePlaceOrder(slug: string) {
      return useMutation({
        mutationFn: (body: CreateOrderInput) => client.post<Order>(`/public/r/${slug}/orders`, body),
      });
    },
  };
}
