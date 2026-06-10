import { ApiClient, createAuthHooks, createAuthStore } from '@feedo/api';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

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

export const { useLogin, useRegister, useLogout, useMe } = createAuthHooks({
  client: apiClient,
  useAuth,
});
