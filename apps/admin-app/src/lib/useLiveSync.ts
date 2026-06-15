import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '@feedo/types';
import { socket, useAuth, useRestaurant } from './api.js';
import { useActiveBranchId } from '../store/branch.js';

const BRAND_WIDE = new Set(['owner', 'brand_owner', 'brand_admin']);

/**
 * Connect to the realtime stream for the branch being managed and invalidate
 * affected queries when orders change. Brand-wide users also join their brand
 * room, so live order events from every branch keep the dashboard fresh even
 * before they switch outlets. Mount once near the app root.
 */
export function useLiveSync() {
  const role = useAuth((s) => s.user?.role);
  const homeBranch = useAuth((s) => s.user?.restaurantId);
  const activeBranch = useActiveBranchId();
  const branchId = activeBranch ?? homeBranch;
  const { data: restaurant } = useRestaurant(Boolean(branchId));
  const brandId = restaurant?.brandId;
  const qc = useQueryClient();

  useEffect(() => {
    if (!branchId) return;
    if (!socket.connected) socket.connect();
    socket.emit('join:restaurant', branchId);
    if (brandId && role && BRAND_WIDE.has(role)) socket.emit('join:brand', brandId);

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
  }, [branchId, brandId, role, qc]);
}
