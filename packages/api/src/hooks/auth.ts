import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthTokens, LoginInput, PublicUser, RegisterInput, Restaurant } from '@feedo/types';
import type { ApiClient } from '../client.js';
import type { AuthStore } from '../auth-store.js';

interface AuthDeps {
  client: ApiClient;
  useAuth: AuthStore;
}

type LoginResult = { user: PublicUser; tokens: AuthTokens };
type RegisterResult = LoginResult & { restaurant: Restaurant };

/** Build app-scoped auth hooks bound to a specific client + store instance. */
export function createAuthHooks({ client, useAuth }: AuthDeps) {
  function useLogin() {
    const setSession = useAuth((s) => s.setSession);
    return useMutation({
      // Auth is its own UX (navigation + inline error) — no toast.
      meta: { silent: true },
      mutationFn: (input: LoginInput) => client.post<LoginResult>('/auth/login', input),
      onSuccess: ({ user, tokens }) => setSession(user, tokens),
    });
  }

  function useRegister() {
    const setSession = useAuth((s) => s.setSession);
    return useMutation({
      meta: { silent: true },
      mutationFn: (input: RegisterInput) => client.post<RegisterResult>('/auth/register', input),
      onSuccess: ({ user, tokens }) => setSession(user, tokens),
    });
  }

  function useLogout() {
    const clear = useAuth((s) => s.clear);
    const qc = useQueryClient();
    return () => {
      clear();
      qc.clear();
    };
  }

  function useMe() {
    const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
    return useQuery({
      queryKey: ['me'],
      queryFn: () => client.get<PublicUser>('/auth/me'),
      enabled: isAuthed,
      // Re-validate the session on focus so a deleted/disabled account is caught
      // promptly (the request 401s → refresh fails → auto-logout) rather than
      // lingering on a still-valid access token.
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
    });
  }

  return { useLogin, useRegister, useLogout, useMe };
}
