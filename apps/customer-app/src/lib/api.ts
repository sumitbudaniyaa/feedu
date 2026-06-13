import { ApiClient, createAuthStore, createPublicHooks } from '@feedo/api';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

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
  usePayOrder,
  useAccount,
  useRedeem,
  useRequestOtp,
  useVerifyOtp,
} = createPublicHooks(apiClient);
