import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Category,
  CreateOrderInput,
  Customer,
  LoyaltyProgram,
  LoyaltyReward,
  Order,
  Product,
  Redemption,
  Restaurant,
  Section,
  Table,
} from '@feedo/types';
import type { ApiClient } from '../client.js';

/** Diner self-service account payload (wallet + history + catalog). */
export interface AccountPayload {
  customer: Customer | null;
  orders: Order[];
  rewards: LoyaltyReward[];
  redemptions: Redemption[];
  /** The active visit-based punch card (null when the restaurant has none). */
  visitProgram: LoyaltyProgram | null;
}

export interface CheckoutResult {
  order: Order;
  razorpay: { orderId: string; amount: number; currency: string; keyId: string } | null;
  demo: boolean;
  /** True when nothing was payable (e.g. reward-only) — order already confirmed. */
  free: boolean;
  /** True for a pay-at-counter (cash) order — confirmed, payment collected later. */
  cash?: boolean;
}

export interface CheckoutInput extends CreateOrderInput {
  customer: { name: string; phone: string };
  /** Loyalty reward applied to the order (requires the customer to be signed in). */
  rewardId?: string;
  /** How the diner pays. Defaults to online (Razorpay). */
  paymentMethod?: 'razorpay' | 'cash';
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
    cgstPercent?: number;
    sgstPercent?: number;
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
          const o = q.state.data;
          if (!o) return 5000;
          // Stop only once the order is truly finished: cancelled/refunded, or
          // served/completed AND paid (a pay-at-counter order can be served while
          // unpaid — keep polling so the later payment is picked up).
          if (['cancelled', 'refunded'].includes(o.status)) return false;
          if (['served', 'completed'].includes(o.status) && o.paymentStatus === 'paid') return false;
          return 5000;
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
    /** Ring a waiter to the diner's table (assistance or bill request). */
    useCallWaiter(slug: string) {
      return useMutation({
        mutationFn: (arg: string | { tableName: string; reason?: 'assistance' | 'bill' }) => {
          const body = typeof arg === 'string' ? { tableName: arg } : arg;
          return client.post<{ called: boolean }>(`/public/r/${slug}/call-waiter`, body);
        },
      });
    },
    /** Start an online payment for an existing (unpaid) order. */
    useStartOrderPayment() {
      return useMutation({
        mutationFn: (orderId: string) =>
          client.post<{
            razorpay?: { orderId: string; amount: number; currency: string; keyId: string } | null;
            demo?: boolean;
            free?: boolean;
            alreadyPaid?: boolean;
          }>(`/public/orders/${orderId}/razorpay`),
      });
    },
    /** Confirm payment for an order (verifies Razorpay signature server-side). */
    usePayOrder() {
      return useMutation({
        mutationFn: ({ orderId, ...body }: PayInput & { orderId: string }) =>
          client.post<Order>(`/public/orders/${orderId}/pay`, body),
      });
    },
    /** Diner account (wallet, past orders, rewards, claims). Uses the OTP token. */
    useAccount(slug?: string, isAuthed?: boolean) {
      return useQuery({
        queryKey: ['public', 'account', slug],
        queryFn: () => client.get<AccountPayload>(`/public/r/${slug}/account`),
        enabled: Boolean(slug && isAuthed),
      });
    },
    /** The signed-in diner's favorite product ids for this restaurant. */
    useFavorites(slug?: string, isAuthed?: boolean) {
      return useQuery({
        queryKey: ['public', 'favorites', slug],
        queryFn: () => client.get<{ productIds: string[] }>(`/public/r/${slug}/favorites`),
        enabled: Boolean(slug && isAuthed),
      });
    },
    /** Add a product to favorites, then refresh the list. */
    useAddFavorite(slug: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (productId: string) =>
          client.post<{ favorited: boolean }>(`/public/r/${slug}/favorites`, { productId }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['public', 'favorites', slug] }),
      });
    },
    /** Remove a product from favorites, then refresh the list. */
    useRemoveFavorite(slug: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (productId: string) =>
          client.delete<{ favorited: boolean }>(`/public/r/${slug}/favorites/${productId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['public', 'favorites', slug] }),
      });
    },
    /**
     * Claim a reward. If linked to a menu item it's placed as a free ₹0 order
     * (returned as `order`) that flows to the kitchen; otherwise a claim code is
     * issued. Deducts points either way.
     */
    useRedeem(slug: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: { rewardId: string; type?: 'dine_in' | 'takeaway'; tableId?: string }) =>
          client.post<{ order?: Order; redemption: Redemption; points: number }>(
            `/public/r/${slug}/redeem`,
            body,
          ),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['public', 'account'] }),
      });
    },
    /** Claim the visit-based punch-card reward (places a free ₹0 order). */
    useClaimVisit(slug: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: { tableId?: string }) =>
          client.post<{ order: Order; visits: number }>(`/public/r/${slug}/claim-visit`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['public', 'account'] }),
      });
    },
    /** Request an OTP for a mobile number (dev returns the code). */
    useRequestOtp() {
      return useMutation({
        mutationFn: (body: { phone: string; name?: string }) =>
          client.post<{ sent: boolean; devCode?: string }>('/public/auth/otp/request', body),
      });
    },
    /** Verify an OTP → returns a customer session token. */
    useVerifyOtp() {
      return useMutation({
        mutationFn: (body: { phone: string; code: string }) =>
          client.post<{ token: string; phone: string; name: string | null }>(
            '/public/auth/otp/verify',
            body,
          ),
      });
    },
  };
}
