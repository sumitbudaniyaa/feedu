import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerAnalytics, SupportTicket } from '@feedo/api';
import {
  ApiClient,
  createAuthHooks,
  createAuthStore,
  createDomainHooks,
  createResource,
  createSocket,
} from '@feedo/api';
import type {
  Category,
  Customer,
  LoyaltyProgram,
  LoyaltyReward,
  Product,
  Section,
  Subscription,
  Table,
  User,
} from '@feedo/types';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

/** App-scoped auth store (namespaced localStorage key). */
export const useAuth = createAuthStore('feedo-admin-auth');

export const apiClient = new ApiClient({
  baseUrl,
  getAccessToken: () => useAuth.getState().tokens?.accessToken,
  getRefreshToken: () => useAuth.getState().tokens?.refreshToken,
  getRestaurantId: () => undefined,
  onTokensRefreshed: (tokens) => useAuth.getState().setTokens(tokens),
  onAuthError: () => useAuth.getState().clear(),
});

export const socket = createSocket(socketUrl);

export const { useLogin, useRegister, useLogout, useMe } = createAuthHooks({
  client: apiClient,
  useAuth,
});

const domain = createDomainHooks(apiClient);
export const {
  useRestaurant,
  useUpdateRestaurant,
  useDashboard,
  useOrders,
  useUpdateOrderStatus,
  useRecordPayment,
  useRedemptions,
  useUpdateRedemption,
} = domain;

/** Upload an image and get back its absolute URL. */
export function uploadImage(file: File) {
  return apiClient.upload<{ url: string }>('/uploads', file);
}

// CRUD resources
export const products = createResource<Product>(apiClient, 'products', '/products');
export const categories = createResource<Category>(apiClient, 'categories', '/categories');
export const sections = createResource<Section>(apiClient, 'sections', '/sections');
export const loyalty = createResource<LoyaltyProgram>(apiClient, 'loyalty', '/loyalty');
export const rewards = createResource<LoyaltyReward>(apiClient, 'rewards', '/rewards');
export const tables = createResource<Table>(apiClient, 'tables', '/tables');
export const staff = createResource<User>(apiClient, 'staff', '/staff');
export const customers = createResource<Customer>(apiClient, 'customers', '/customers');

/** Change the signed-in account's password (verifies the current one). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', body),
  });
}

/** Tell the diner a waiter is on the way (after accepting their table call). */
export function useAttendCall() {
  return useMutation({
    mutationFn: (tableName: string) => apiClient.post('/waiter/attend', { tableName }),
  });
}

/** Full analytics for one diner (most-ordered, claims, spend, etc.). */
export function useCustomerAnalytics(id?: string) {
  return useQuery({
    queryKey: ['customer-analytics', id],
    queryFn: () => apiClient.get<CustomerAnalytics>(`/customers/${id}`),
    enabled: Boolean(id),
  });
}

/** The current restaurant's subscription (read-only — Feedu manages billing). */
export function useSubscription() {
  return useQuery({
    queryKey: ['restaurant', 'subscription'],
    queryFn: () => apiClient.get<Subscription | null>('/restaurants/me/subscription'),
  });
}

/** Support tickets raised by this restaurant. */
export function useSupportTickets() {
  return useQuery({
    queryKey: ['support'],
    queryFn: () => apiClient.get<SupportTicket[]>('/support'),
  });
}
export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subject: string; message: string; category?: string; priority?: string }) =>
      apiClient.post<SupportTicket>('/support', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support'] }),
  });
}
export function useReplyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      apiClient.post<SupportTicket>(`/support/${id}/reply`, { message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support'] }),
  });
}
