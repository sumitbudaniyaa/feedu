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
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Server → client payloads. */
export interface ServerToClientEvents {
  'order:created': (order: Order) => void;
  'order:updated': (order: Order) => void;
  'order:status_changed': (payload: { orderId: string; status: Order['status'] }) => void;
  'notification:new': (notification: Notification) => void;
  'dashboard:refresh': () => void;
  'waiter:called': (payload: { tableName: string; at: string }) => void;
  'waiter:attending': (payload: { tableName: string; at: string }) => void;
}

/** Client → server payloads. */
export interface ClientToServerEvents {
  /** Join a restaurant's room to receive its realtime stream. */
  'join:restaurant': (restaurantId: string) => void;
  /** Customer subscribes to a single order's lifecycle. */
  'join:order': (orderId: string) => void;
}

/** Socket.IO room naming helpers — keep server + clients consistent. */
export const rooms = {
  restaurant: (id: string) => `restaurant:${id}`,
  kitchen: (id: string) => `kitchen:${id}`,
  order: (id: string) => `order:${id}`,
};
