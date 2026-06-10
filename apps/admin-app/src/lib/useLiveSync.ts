import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '@feedo/types';
import { socket, useAuth } from './api.js';

/**
 * Connect to the realtime stream for the current restaurant and invalidate
 * affected queries when orders change. Mount once near the app root.
 */
export function useLiveSync() {
  const restaurantId = useAuth((s) => s.user?.restaurantId);
  const qc = useQueryClient();

  useEffect(() => {
    if (!restaurantId) return;
    if (!socket.connected) socket.connect();
    socket.emit('join:restaurant', restaurantId);

    const refreshOrders = () => qc.invalidateQueries({ queryKey: ['orders'] });
    const refreshDash = () => qc.invalidateQueries({ queryKey: ['analytics'] });

    socket.on(SOCKET_EVENTS.ORDER_CREATED, refreshOrders);
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, refreshOrders);
    socket.on(SOCKET_EVENTS.DASHBOARD_REFRESH, refreshDash);

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_CREATED, refreshOrders);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, refreshOrders);
      socket.off(SOCKET_EVENTS.DASHBOARD_REFRESH, refreshDash);
    };
  }, [restaurantId, qc]);
}
