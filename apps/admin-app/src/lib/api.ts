import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerAnalytics, SupportTicket } from '@feedo/api';
import { getActiveBranchId } from '../store/branch.js';
import {
  ApiClient,
  createAuthHooks,
  createAuthStore,
  createDomainHooks,
  createResource,
  createSocket,
} from '@feedo/api';
import type {
  BranchComparison,
  Category,
  Customer,
  LoyaltyProgram,
  LoyaltyReward,
  Product,
  Reservation,
  Section,
  Subscription,
  Table,
  TableStatus,
  User,
} from '@feedo/types';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

/** App-scoped auth store (namespaced localStorage key). */
export const useAuth = createAuthStore('feedo-admin-auth');

export const apiClient = new ApiClient({
  baseUrl,
  getAccessToken: () => useAuth.getState().tokens?.accessToken,
  getRefreshToken: () => useAuth.getState().tokens?.refreshToken,
  // Active branch → sent as the x-branch-id tenant header.
  getBranchId: () => getActiveBranchId(),
  onTokensRefreshed: (tokens) => useAuth.getState().setTokens(tokens),
  onAuthError: () => useAuth.getState().clear(),
});

export const socket = createSocket(socketUrl);

// Onboarding is super-admin-only — no self-signup in the admin app (useRegister omitted).
export const { useLogin, useLogout, useMe } = createAuthHooks({
  client: apiClient,
  useAuth,
});

const domain = createDomainHooks(apiClient);
export const {
  useRestaurant,
  useUpdateRestaurant,
  useDashboard,
  useOrders,
  useUpdateOrderStatus,
  useRecordPayment,
  useRedemptions,
  useUpdateRedemption,
} = domain;

/** Upload an image and get back its absolute URL. */
export function uploadImage(file: File) {
  return apiClient.upload<{ url: string }>('/uploads', file);
}

// CRUD resources
export const products = createResource<Product>(apiClient, 'products', '/products', 'Product');
export const categories = createResource<Category>(apiClient, 'categories', '/categories', 'Category');
export const sections = createResource<Section>(apiClient, 'sections', '/sections', 'Section');
export const loyalty = createResource<LoyaltyProgram>(apiClient, 'loyalty', '/loyalty', 'Loyalty program');
export const rewards = createResource<LoyaltyReward>(apiClient, 'rewards', '/rewards', 'Reward');
export const tables = createResource<Table>(apiClient, 'tables', '/tables', 'Table');

/** Set a table's seat-occupancy status (available | occupied | reserved) + reservation. */
export function useUpdateTableStatus() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Seat updated' },
    mutationFn: ({ id, status, reservation }: { id: string; status: TableStatus; reservation?: Reservation | null }) =>
      apiClient.patch<Table>(`/tables/${id}/status`, { status, reservation }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  });
}

/** A live table session (one party's visit, seating → settlement). */
export interface TableSession {
  _id: string;
  tableId: string;
  status: 'open' | 'bill_requested' | 'closed';
  partySize?: number;
  openedBy: 'qr' | 'staff';
  openedAt: string;
}

/** Live sessions for the branch — the seat grid joins these to its tables by id. */
export function useActiveSessions() {
  return useQuery({
    queryKey: ['tables', 'sessions'],
    queryFn: () => apiClient.get<TableSession[]>('/tables/sessions/active'),
  });
}

function useSessionAction(path: (id: string) => string, successMessage: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage },
    mutationFn: ({ id, partySize }: { id: string; partySize?: number }) =>
      apiClient.post(path(id), { partySize }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['tables', 'sessions'] });
    },
  });
}

/** Seat a party (occupy before any order). */
export const useSeatTable = () => useSessionAction((id) => `/tables/${id}/seat`, 'Table seated');
/** Free a table (close its live session). */
export const useFreeTable = () => useSessionAction((id) => `/tables/${id}/free`, 'Table freed');

export const staff = createResource<User>(apiClient, 'staff', '/staff', 'Staff member');
export const customers = createResource<Customer>(apiClient, 'customers', '/customers', 'Customer');

/** Change the signed-in account's password (verifies the current one). */
export function useChangePassword() {
  return useMutation({
    meta: { successMessage: 'Password changed' },
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', body),
  });
}

/** Tell the diner a waiter is on the way (after accepting their table call). */
export function useAttendCall() {
  return useMutation({
    meta: { successMessage: 'Customer notified' },
    mutationFn: (tableName: string) => apiClient.post('/waiter/attend', { tableName }),
  });
}

/** Full analytics for one diner (most-ordered, claims, spend, etc.). */
export function useCustomerAnalytics(id?: string) {
  return useQuery({
    queryKey: ['customer-analytics', id],
    queryFn: () => apiClient.get<CustomerAnalytics>(`/customers/${id}`),
    enabled: Boolean(id),
  });
}

export interface Branch {
  _id: string;
  name: string;
  slug: string;
  isLive: boolean;
  contactNumber?: string;
  createdAt: string;
}

export interface BrandInfo {
  _id: string;
  name: string;
  slug: string;
  accountType: 'single' | 'multi';
  branchCount: number;
  /** Self-serve branch cap set by the Feedu team. */
  maxBranches: number;
  description?: string;
  cuisineType?: string[];
  branding?: { accent?: string; themeMode?: string };
  tax?: { gstNumber?: string; gstPercent?: number; inclusive?: boolean };
  currency?: string;
}

/** The signed-in account's brand — drives whether multi-branch features show. */
export function useBrand() {
  return useQuery({
    queryKey: ['brand', 'me'],
    queryFn: () => apiClient.get<BrandInfo | null>('/restaurants/me/brand'),
  });
}

/** Update brand-level settings (name/branding/tax/currency) — applies to all branches. */
export function useUpdateBrandSettings() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Brand settings saved' },
    mutationFn: (body: Record<string, unknown>) => apiClient.patch('/restaurants/me/brand', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand'] });
      qc.invalidateQueries({ queryKey: ['restaurant'] });
    },
  });
}

/** All branches of the active brand (for the branch switcher + Branches page). */
export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.get<Branch[]>('/restaurants/branches'),
  });
}

/** Brand-wide branch comparison (revenue/orders per branch). Brand roles only. */
export function useBranchComparison(range: 'day' | 'week' | 'month', enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'branches', range],
    queryFn: () => apiClient.get<BranchComparison>(`/analytics/branches?range=${range}`),
    enabled,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Branch added' },
    mutationFn: (body: { name: string; contactNumber?: string }) =>
      apiClient.post<Branch>('/restaurants/branches', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export interface BranchOverride {
  _id: string;
  productId: string;
  priceOverride: number | null;
  isAvailable: boolean;
  stock: number | null;
  branchExclusive: boolean;
}

/** This branch's raw menu overrides (availability/stock/price), for the Inventory branch view. */
export function useBranchOverrides(branchId?: string | null) {
  return useQuery({
    queryKey: ['branch-overrides', branchId],
    queryFn: () => apiClient.get<BranchOverride[]>('/branch-menu/overrides'),
    enabled: Boolean(branchId),
  });
}

/** Set a per-branch override for a product (availability/stock/price) — only this branch. */
export function useSetBranchOverride() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Branch availability updated' },
    mutationFn: ({ productId, body }: { productId: string; body: Record<string, unknown> }) =>
      apiClient.patch(`/branch-menu/${productId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branch-overrides'] }),
  });
}

/** Edit a branch (name / contact / live state). */
export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Branch updated' },
    mutationFn: ({ id, body }: { id: string; body: { name?: string; contactNumber?: string; isLive?: boolean } }) =>
      apiClient.patch<Branch>(`/restaurants/branches/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

/** Delete a branch (and its branch-scoped data). */
export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Branch deleted' },
    mutationFn: (id: string) => apiClient.delete(`/restaurants/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export interface BranchManager {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
}

/** Managers/logins for a specific branch (brand-wide roles). */
export function useBranchManagers(branchId?: string) {
  return useQuery({
    queryKey: ['branch-managers', branchId],
    queryFn: () => apiClient.get<BranchManager[]>(`/restaurants/branches/${branchId}/managers`),
    enabled: Boolean(branchId),
  });
}

export function useCreateBranchManager(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Manager added' },
    mutationFn: (body: { name: string; email: string; phone?: string; password: string }) =>
      apiClient.post<BranchManager>(`/restaurants/branches/${branchId}/managers`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branch-managers', branchId] }),
  });
}

export function useUpdateBranchManager(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Manager updated' },
    mutationFn: ({ userId, body }: { userId: string; body: { name?: string; phone?: string; password?: string; isActive?: boolean } }) =>
      apiClient.patch<BranchManager>(`/restaurants/branches/${branchId}/managers/${userId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branch-managers', branchId] }),
  });
}

export function useDeleteBranchManager(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Manager removed' },
    mutationFn: (userId: string) =>
      apiClient.delete(`/restaurants/branches/${branchId}/managers/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branch-managers', branchId] }),
  });
}

/** The current restaurant's subscription (read-only — Feedu manages billing). */
export function useSubscription() {
  return useQuery({
    queryKey: ['restaurant', 'subscription'],
    queryFn: () => apiClient.get<Subscription | null>('/restaurants/me/subscription'),
  });
}

/** Support tickets raised by this restaurant. */
export function useSupportTickets() {
  return useQuery({
    queryKey: ['support'],
    queryFn: () => apiClient.get<SupportTicket[]>('/support'),
  });
}
export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Ticket created' },
    mutationFn: (body: { subject: string; message: string; category?: string; priority?: string }) =>
      apiClient.post<SupportTicket>('/support', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support'] }),
  });
}
export function useReplyTicket() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Reply sent' },
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      apiClient.post<SupportTicket>(`/support/${id}/reply`, { message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support'] }),
  });
}
