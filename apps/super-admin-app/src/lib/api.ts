import { ApiClient, createAuthHooks, createAuthStore, createPlatformHooks } from '@feedo/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lead, LeadStatus } from '@feedo/types';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const useAuth = createAuthStore('feedo-super-auth');

export const apiClient = new ApiClient({
  baseUrl,
  getAccessToken: () => useAuth.getState().tokens?.accessToken,
  getRefreshToken: () => useAuth.getState().tokens?.refreshToken,
  onTokensRefreshed: (tokens) => useAuth.getState().setTokens(tokens),
  onAuthError: () => useAuth.getState().clear(),
});

export const { useLogin, useLogout, useMe } = createAuthHooks({ client: apiClient, useAuth });

const platform = createPlatformHooks(apiClient);
export const {
  useStats,
  useAnalytics,
  useBrands,
  useOnboardBranch,
  useSuspendBrand,
  useUpdateBrandSubscription,
  useDeleteBrand,
  useRestaurants,
  useRestaurantDetail,
  useUsers,
  useAllOrders,
  useAllCustomers,
  useUpdateSubscription,
  useToggleLive,
  useOnboardRestaurant,
  useDeleteRestaurant,
  useUpdateAccount,
  useSupportTickets,
  useUpdateTicket,
  useCreateEmployee,
  useUpdateEmployee,
  useCustomerAnalytics,
} = platform;

// ─── Leads (sales/demo enquiries from the landing site) ───────────────────
export function useLeads(params?: { status?: LeadStatus; type?: 'demo' | 'sales' }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.type) qs.set('type', params.type);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({
    queryKey: ['leads', params?.status ?? 'all', params?.type ?? 'all'],
    queryFn: () => apiClient.get<Lead[]>(`/platform/leads${suffix}`),
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      apiClient.patch<Lead>(`/platform/leads/${id}`, { status }),
    meta: { successMessage: 'Lead updated' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
