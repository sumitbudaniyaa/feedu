import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from './client.js';

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

type Params = Record<string, string | number | boolean | undefined>;

/**
 * Build typed TanStack Query hooks for a tenant-scoped REST resource.
 * Mutations invalidate the resource's list cache on success.
 */
export function createResource<T extends { _id: string }>(
  client: ApiClient,
  key: string,
  path: string,
  /** Human label for toasts, e.g. "Product". Defaults to a humanized key. */
  label?: string,
) {
  const listKey = (params?: Params) => [key, 'list', params ?? {}] as const;
  const noun = label ?? key.charAt(0).toUpperCase() + key.slice(1);

  return {
    key,
    useList(params?: Params, options?: { enabled?: boolean }) {
      return useQuery({
        queryKey: listKey(params),
        queryFn: () => client.get<T[]>(`${path}${qs(params)}`),
        enabled: options?.enabled ?? true,
      });
    },
    useItem(id?: string) {
      return useQuery({
        queryKey: [key, id],
        queryFn: () => client.get<T>(`${path}/${id}`),
        enabled: Boolean(id),
      });
    },
    useCreate() {
      const qc = useQueryClient();
      return useMutation({
        meta: { successMessage: `${noun} created` },
        mutationFn: (body: Partial<T> | Record<string, unknown>) => client.post<T>(path, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      });
    },
    useUpdate() {
      const qc = useQueryClient();
      return useMutation({
        meta: { successMessage: `${noun} updated` },
        mutationFn: ({ id, body }: { id: string; body: Partial<T> | Record<string, unknown> }) =>
          client.patch<T>(`${path}/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      });
    },
    useRemove() {
      const qc = useQueryClient();
      return useMutation({
        meta: { successMessage: `${noun} deleted` },
        mutationFn: (id: string) => client.delete<{ _id: string }>(`${path}/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      });
    },
  };
}

export type Resource<T extends { _id: string }> = ReturnType<typeof createResource<T>>;
