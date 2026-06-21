import type { Order } from './entities/order.js';
import type { Notification } from './entities/notification.js';

/** Canonical Socket.IO event names shared by server + clients. */
export const SOCKET_EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  NOTIFICATION_NEW: 'notification:new',
  DASHBOARD_REFRESH: 'dashboard:refresh',
  WAITER_CALLED: 'waiter:called',
  WAITER_ATTENDING: 'waiter:attending',
  TABLE_UPDATED: 'table:updated',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Server → client payloads. */
export interface ServerToClientEvents {
  'order:created': (order: Order) => void;
  'order:updated': (order: Order) => void;
  'order:status_changed': (payload: { orderId: string; status: Order['status'] }) => void;
  'notification:new': (notification: Notification) => void;
  'dashboard:refresh': () => void;
  'waiter:called': (payload: { tableName: string; at: string; reason?: 'assistance' | 'bill' }) => void;
  'waiter:attending': (payload: { tableName: string; at: string }) => void;
  /** A table's occupancy/reservation changed — refresh the seat grid. */
  'table:updated': (payload: { tableId: string }) => void;
}

/** Client → server payloads. */
export interface ClientToServerEvents {
  /** Join a restaurant's (branch's) room to receive its realtime stream. */
  'join:restaurant': (restaurantId: string) => void;
  /** Join a brand's room to receive the realtime stream of all its branches. */
  'join:brand': (brandId: string) => void;
  /** Customer subscribes to a single order's lifecycle. */
  'join:order': (orderId: string) => void;
}

/**
 * Socket.IO room naming helpers — keep server + clients consistent.
 *
 * Multi-branch: `restaurant`/`branch` are the same per-outlet room (a Restaurant
 * doc IS a branch); `brand` fans out across every branch of a tenant so
 * brand-wide dashboards can watch all outlets at once.
 */
export const rooms = {
  restaurant: (id: string) => `restaurant:${id}`,
  /** Alias of `restaurant` — a branch's per-outlet room. */
  branch: (id: string) => `restaurant:${id}`,
  brand: (id: string) => `brand:${id}`,
  kitchen: (id: string) => `kitchen:${id}`,
  order: (id: string) => `order:${id}`,
};
