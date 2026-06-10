import { useMutation, useQuery } from '@tanstack/react-query';
import type { Category, CreateOrderInput, Order, Product, Restaurant, Section, Table } from '@feedo/types';
import type { ApiClient } from '../client.js';

export interface CheckoutResult {
  order: Order;
  razorpay: { orderId: string; amount: number; currency: string; keyId: string } | null;
  demo: boolean;
}

export interface CheckoutInput extends CreateOrderInput {
  customer: { name: string; phone: string };
}

export interface PayInput {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

/** Order plus the restaurant info needed to render a self-contained invoice. */
export interface TrackedOrder extends Order {
  restaurant: {
    name: string;
    currency?: string;
    gstNumber?: string;
    gstPercent?: number;
    contactNumber?: string;
    address?: { line1?: string; city?: string; state?: string };
  } | null;
}

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
        queryFn: () => client.get<TrackedOrder>(`/public/orders/${orderId}`),
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
    /** Create a pending order + Razorpay order. */
    useCheckout(slug: string) {
      return useMutation({
        mutationFn: (body: CheckoutInput) => client.post<CheckoutResult>(`/public/r/${slug}/checkout`, body),
      });
    },
    /** Confirm payment for an order (verifies Razorpay signature server-side). */
    usePayOrder() {
      return useMutation({
        mutationFn: ({ orderId, ...body }: PayInput & { orderId: string }) =>
          client.post<Order>(`/public/orders/${orderId}/pay`, body),
      });
    },
  };
}
