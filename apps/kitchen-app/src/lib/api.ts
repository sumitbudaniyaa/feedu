import {
  ApiClient,
  createAuthHooks,
  createAuthStore,
  createDomainHooks,
  createSocket,
} from '@feedo/api';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

export const useAuth = createAuthStore('feedo-kitchen-auth');

export const apiClient = new ApiClient({
  baseUrl,
  getAccessToken: () => useAuth.getState().tokens?.accessToken,
  getRefreshToken: () => useAuth.getState().tokens?.refreshToken,
  onTokensRefreshed: (tokens) => useAuth.getState().setTokens(tokens),
  onAuthError: () => useAuth.getState().clear(),
});

export const socket = createSocket(socketUrl);

export const { useLogin, useLogout, useMe } = createAuthHooks({ client: apiClient, useAuth });

const domain = createDomainHooks(apiClient);
export const { useOrders, useUpdateOrderStatus } = domain;
