import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Subscription } from '@feedo/types';
import type { ApiClient } from '../client.js';

export interface PlatformStats {
  totalMrr: number;
  restaurants: number;
  activeStaff: number;
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

/** Super-admin platform hooks (cross-tenant). */
export function createPlatformHooks(client: ApiClient) {
  return {
    useStats() {
      return useQuery({
        queryKey: ['platform', 'stats'],
        queryFn: () => client.get<PlatformStats>('/platform/stats'),
      });
    },
    useRestaurants() {
      return useQuery({
        queryKey: ['platform', 'restaurants'],
        queryFn: () => client.get<PlatformRestaurant[]>('/platform/restaurants'),
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
