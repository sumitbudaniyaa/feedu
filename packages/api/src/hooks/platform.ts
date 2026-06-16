import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Customer, Order, Subscription, UserRoleType } from '@feedo/types';
import type { ApiClient } from '../client.js';

export interface PlatformStats {
  totalMrr: number;
  /** Feedo's own SaaS revenue (what restaurants pay us), normalised to monthly. */
  saasMrr: number;
  saasArr: number;
  payingRestaurants: number;
  restaurants: number;
  liveRestaurants: number;
  activeStaff: number;
  customers: number;
  orders: number;
  gmv: number;
  activeSubscriptions: number;
  trialing: number;
}

export interface PlatformRestaurant {
  _id: string;
  name: string;
  slug: string;
  isLive: boolean;
  brandId?: string | null;
  createdAt: string;
  subscription: Subscription | null;
  orderCount: number;
}

export interface PlatformBranch {
  _id: string;
  name: string;
  slug: string;
  isLive: boolean;
  contactNumber: string | null;
  createdAt: string;
  orderCount: number;
  subscription: Subscription | null;
}

export interface PlatformBrand {
  _id: string;
  name: string;
  slug: string;
  accountType: 'single' | 'multi';
  cuisineType: string[];
  accent: string;
  createdAt: string;
  branchCount: number;
  liveBranchCount: number;
  totalOrders: number;
  mrr: number;
  branches: PlatformBranch[];
}

export interface PlatformAnalytics {
  series: { date: string; revenue: number; orders: number }[];
  topRestaurants: { restaurantId: string; name: string; revenue: number; orders: number }[];
  channelMix: { channel: string; orders: number; revenue: number }[];
}

export interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRoleType;
  isActive: boolean;
  createdAt: string;
  restaurantId: string | null;
  restaurantName: string | null;
}

export type PlatformOrder = Order & { restaurantName: string | null };
export type PlatformCustomer = Customer & { restaurantName: string | null };

export interface CustomerAnalytics {
  customer: { phone: string; name?: string; points?: number };
  totalSpent: number;
  totalOrders: number;
  avgOrderValue: number;
  points: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  peakHour: number | null;
  topItems: { name: string; qty: number; spent: number }[];
  rewardClaimCount: number;
  rewardClaims: Order[];
  redemptions: { _id: string; rewardTitle: string; pointsCost: number; createdAt: string }[];
  recentOrders: Order[];
}

export interface SupportTicketReply {
  author: 'restaurant' | 'feedo';
  authorName?: string;
  message: string;
  createdAt: string;
}
export interface SupportTicket {
  _id: string;
  restaurantId: string;
  restaurantName?: string;
  subject: string;
  message: string;
  category: 'billing' | 'technical' | 'feature' | 'other';
  priority: 'low' | 'normal' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdByName?: string;
  createdByEmail?: string;
  replies: SupportTicketReply[];
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantDetail {
  restaurant: PlatformRestaurant & Record<string, unknown>;
  subscription: Subscription | null;
  staff: { _id: string; name: string; email: string; role: string; isActive: boolean }[];
  productCount: number;
  customerCount: number;
  recentOrders: Order[];
  revenue: number;
  paidOrders: number;
}

/** Super-admin platform hooks (cross-tenant). */
export function createPlatformHooks(client: ApiClient) {
  return {
    useStats() {
      return useQuery({ queryKey: ['platform', 'stats'], queryFn: () => client.get<PlatformStats>('/platform/stats') });
    },
    useAnalytics() {
      return useQuery({
        queryKey: ['platform', 'analytics'],
        queryFn: () => client.get<PlatformAnalytics>('/platform/analytics'),
      });
    },
    useRestaurants() {
      return useQuery({
        queryKey: ['platform', 'restaurants'],
        queryFn: () => client.get<PlatformRestaurant[]>('/platform/restaurants'),
      });
    },
    useBrands() {
      return useQuery({
        queryKey: ['platform', 'brands'],
        queryFn: () => client.get<PlatformBrand[]>('/platform/brands'),
      });
    },
    useOnboardBranch() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ brandId, body }: { brandId: string; body: { name: string; contactNumber?: string } }) =>
          client.post(`/platform/brands/${brandId}/branches`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
      });
    },
    useRestaurantDetail(id?: string) {
      return useQuery({
        queryKey: ['platform', 'restaurant', id],
        queryFn: () => client.get<RestaurantDetail>(`/platform/restaurants/${id}`),
        enabled: Boolean(id),
      });
    },
    useUsers(params?: { role?: string; search?: string }) {
      const q = new URLSearchParams();
      if (params?.role) q.set('role', params.role);
      if (params?.search) q.set('search', params.search);
      const suffix = q.toString() ? `?${q}` : '';
      return useQuery({
        queryKey: ['platform', 'users', params ?? {}],
        queryFn: () => client.get<PlatformUser[]>(`/platform/users${suffix}`),
      });
    },
    useAllOrders() {
      return useQuery({
        queryKey: ['platform', 'orders'],
        queryFn: () => client.get<PlatformOrder[]>('/platform/orders'),
      });
    },
    useAllCustomers(params?: { restaurantId?: string; search?: string }) {
      const q = new URLSearchParams();
      if (params?.restaurantId) q.set('restaurantId', params.restaurantId);
      if (params?.search) q.set('search', params.search);
      const suffix = q.toString() ? `?${q}` : '';
      return useQuery({
        queryKey: ['platform', 'customers', params ?? {}],
        queryFn: () => client.get<PlatformCustomer[]>(`/platform/customers${suffix}`),
      });
    },
    useCustomerAnalytics(id?: string) {
      return useQuery({
        queryKey: ['platform', 'customer', id],
        queryFn: () => client.get<CustomerAnalytics>(`/platform/customers/${id}`),
        enabled: Boolean(id),
      });
    },
    useUpdateSubscription() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
          client.patch<Subscription>(`/platform/restaurants/${id}/subscription`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
      });
    },
    useToggleLive() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, isLive }: { id: string; isLive: boolean }) =>
          client.patch(`/platform/restaurants/${id}`, { isLive }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
      });
    },
    useOnboardRestaurant() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: Record<string, unknown>) => client.post('/platform/restaurants', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
      });
    },
    useDeleteRestaurant() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => client.delete(`/platform/restaurants/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
      });
    },
    useUpdateAccount() {
      return useMutation({
        mutationFn: (body: { name?: string; email?: string; password?: string }) =>
          client.patch('/platform/account', body),
      });
    },
    useCreateEmployee() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: { name: string; email: string; password: string; phone?: string }) =>
          client.post('/platform/users', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'users'] }),
      });
    },
    useUpdateEmployee() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, body }: { id: string; body: { name?: string; email?: string; phone?: string; password?: string } }) =>
          client.patch(`/platform/users/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'users'] }),
      });
    },
    useSupportTickets(status?: string) {
      const suffix = status ? `?status=${status}` : '';
      return useQuery({
        queryKey: ['platform', 'support', status ?? 'all'],
        queryFn: () => client.get<SupportTicket[]>(`/platform/support${suffix}`),
      });
    },
    useUpdateTicket() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, body }: { id: string; body: { status?: string; reply?: string } }) =>
          client.patch<SupportTicket>(`/platform/support/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'support'] }),
      });
    },
  };
}
