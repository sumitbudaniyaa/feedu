import { ApiClient, createAuthHooks, createAuthStore, createPlatformHooks } from '@feedo/api';

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
} = platform;
