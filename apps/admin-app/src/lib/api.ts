import { useQuery } from '@tanstack/react-query';
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

/** The current restaurant's subscription (read-only — Feedo manages billing). */
export function useSubscription() {
  return useQuery({
    queryKey: ['restaurant', 'subscription'],
    queryFn: () => apiClient.get<Subscription | null>('/restaurants/me/subscription'),
  });
}
