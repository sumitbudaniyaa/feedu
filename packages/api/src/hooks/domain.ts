import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DashboardStats,
  Order,
  OrderStatus,
  Redemption,
  Restaurant,
  CreateOrderInput,
} from '@feedo/types';
import type { ApiClient } from '../client.js';

/** Domain-specific hooks that don't fit the generic CRUD resource shape. */
export function createDomainHooks(client: ApiClient) {
  return {
    // ---- Restaurant (current tenant) ----
    useRestaurant(enabled = true) {
      return useQuery({
        queryKey: ['restaurant', 'me'],
        queryFn: () => client.get<Restaurant>('/restaurants/me'),
        enabled,
        staleTime: 60_000,
      });
    },
    useUpdateRestaurant() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: Record<string, unknown>) => client.patch<Restaurant>('/restaurants/me', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant'] }),
      });
    },

    // ---- Analytics ----
    useDashboard(range: 'day' | 'week' | 'month' = 'week') {
      return useQuery({
        queryKey: ['analytics', 'dashboard', range],
        queryFn: () => client.get<DashboardStats>(`/analytics/dashboard?range=${range}`),
        staleTime: 30_000,
      });
    },

    // ---- Orders ----
    useOrders(params?: { status?: string; active?: boolean }) {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.active) query.set('active', 'true');
      const suffix = query.toString() ? `?${query}` : '';
      return useQuery({
        queryKey: ['orders', 'list', params ?? {}],
        queryFn: () => client.get<Order[]>(`/orders${suffix}`),
      });
    },
    useUpdateOrderStatus() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
          client.patch<Order>(`/orders/${id}/status`, { status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
      });
    },
    useCreateOrder() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: CreateOrderInput) => client.post<Order>('/orders', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
      });
    },

    // ---- Reward redemptions (staff side) ----
    useRedemptions() {
      return useQuery({
        queryKey: ['redemptions'],
        queryFn: () => client.get<Redemption[]>('/rewards/redemptions'),
      });
    },
    useUpdateRedemption() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'fulfilled' | 'cancelled' }) =>
          client.patch<Redemption>(`/rewards/redemptions/${id}`, { status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['redemptions'] }),
      });
    },
  };
}
