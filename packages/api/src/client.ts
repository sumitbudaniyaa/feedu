import type { ApiResponse, AuthTokens } from '@feedo/types';

export interface ApiClientOptions {
  baseUrl: string;
  /** Read the current access token (from the auth store). */
  getAccessToken: () => string | undefined;
  /** Read the refresh token for silent re-auth. */
  getRefreshToken: () => string | undefined;
  /** Persist refreshed tokens. */
  onTokensRefreshed: (tokens: AuthTokens) => void;
  /** Called when refresh fails — app should log out. */
  onAuthError: () => void;
  /** Active branch sent as the `x-branch-id` tenant header. */
  getBranchId?: () => string | undefined;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Fetch-based API client with automatic bearer auth and one-shot token refresh
 * on 401. Returns unwrapped `data` from the standard backend envelope.
 */
export class ApiClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(private opts: ApiClientOptions) {}

  private async raw<T>(
    method: string,
    path: string,
    body?: unknown,
    retry = true,
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.opts.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const branchId = this.opts.getBranchId?.();
    if (branchId) headers['x-branch-id'] = branchId;

    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && retry && this.opts.getRefreshToken()) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.raw<T>(method, path, body, false);
      this.opts.onAuthError();
    }

    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!res.ok || !json || json.success === false) {
      const err = json && json.success === false ? json.error : undefined;
      throw new ApiError(
        res.status,
        err?.code ?? 'UNKNOWN',
        err?.message ?? 'Request failed',
        err?.details,
      );
    }
    return json.data;
  }

  private tryRefresh(): Promise<boolean> {
    this.refreshing ??= (async () => {
      try {
        const res = await fetch(`${this.opts.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.opts.getRefreshToken() }),
        });
        const json = (await res.json()) as ApiResponse<{ tokens: AuthTokens }>;
        if (!res.ok || json.success === false) return false;
        this.opts.onTokensRefreshed(json.data.tokens);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  /** Multipart upload (FormData). Lets the browser set the multipart boundary. */
  async upload<T>(path: string, file: File, field = 'file'): Promise<T> {
    const form = new FormData();
    form.append(field, file);
    const headers: Record<string, string> = {};
    const token = this.opts.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const branchId = this.opts.getBranchId?.();
    if (branchId) headers['x-branch-id'] = branchId;

    const res = await fetch(`${this.opts.baseUrl}${path}`, { method: 'POST', headers, body: form });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!res.ok || !json || json.success === false) {
      const err = json && json.success === false ? json.error : undefined;
      throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? 'Upload failed', err?.details);
    }
    return json.data;
  }

  get<T>(path: string) {
    return this.raw<T>('GET', path);
  }
  post<T>(path: string, body?: unknown) {
    return this.raw<T>('POST', path, body);
  }
  patch<T>(path: string, body?: unknown) {
    return this.raw<T>('PATCH', path, body);
  }
  put<T>(path: string, body?: unknown) {
    return this.raw<T>('PUT', path, body);
  }
  delete<T>(path: string) {
    return this.raw<T>('DELETE', path);
  }
}
