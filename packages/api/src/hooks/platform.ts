import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Customer, Order, Subscription, UserRoleType } from '@feedo/types';
import type { ApiClient } from '../client.js';

export interface PlatformStats {
  totalMrr: number;
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
  createdAt: string;
  subscription: Subscription | null;
  orderCount: number;
}

export interface PlatformAnalytics {
  series: { date: string; revenue: number; orders: number }[];
  topRestaurants: { restaurantId: string; name: string; revenue: number; orders: number }[];
}

export interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  role: UserRoleType;
  isActive: boolean;
  createdAt: string;
  restaurantId: string | null;
  restaurantName: string | null;
}

export type PlatformOrder = Order & { restaurantName: string | null };
export type PlatformCustomer = Customer & { restaurantName: string | null };

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
    useAllCustomers() {
      return useQuery({
        queryKey: ['platform', 'customers'],
        queryFn: () => client.get<PlatformCustomer[]>('/platform/customers'),
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
  };
}
