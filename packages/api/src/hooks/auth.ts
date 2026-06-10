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
      mutationFn: (input: LoginInput) => client.post<LoginResult>('/auth/login', input),
      onSuccess: ({ user, tokens }) => setSession(user, tokens),
    });
  }

  function useRegister() {
    const setSession = useAuth((s) => s.setSession);
    return useMutation({
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
      staleTime: 5 * 60 * 1000,
    });
  }

  return { useLogin, useRegister, useLogout, useMe };
}
