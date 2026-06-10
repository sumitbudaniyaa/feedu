import { ApiClient, createAuthHooks, createAuthStore } from '@feedo/api';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const useAuth = createAuthStore('feedo-customer-auth');

export const apiClient = new ApiClient({
  baseUrl,
  getAccessToken: () => useAuth.getState().tokens?.accessToken,
  getRefreshToken: () => useAuth.getState().tokens?.refreshToken,
  onTokensRefreshed: (tokens) => useAuth.getState().setTokens(tokens),
  onAuthError: () => useAuth.getState().clear(),
});

export const { useLogin, useRegister, useLogout, useMe } = createAuthHooks({
  client: apiClient,
  useAuth,
});
