import { ApiClient, createAuthStore, createPublicHooks, createSocket } from '@feedo/api';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

/** Realtime channel (e.g. to hear when a waiter is on the way). */
export const socket = createSocket(socketUrl);

// Customer sessions are optional/anonymous; store kept for future customer login.
export const useAuth = createAuthStore('feedo-customer-auth');

export const apiClient = new ApiClient({
  baseUrl,
  getAccessToken: () => useAuth.getState().tokens?.accessToken,
  getRefreshToken: () => useAuth.getState().tokens?.refreshToken,
  onTokensRefreshed: (tokens) => useAuth.getState().setTokens(tokens),
  onAuthError: () => useAuth.getState().clear(),
});

export const {
  useMenuBySlug,
  useMenuByQr,
  useTrackOrder,
  usePlaceOrder,
  useCheckout,
  useCallWaiter,
  usePayOrder,
  useAccount,
  useRedeem,
  useRequestOtp,
  useVerifyOtp,
} = createPublicHooks(apiClient);
