import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import {
  rooms,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@feedo/types';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

type FeeduServer = Server<ClientToServerEvents, ServerToClientEvents>;

let io: FeeduServer | null = null;

export function initSockets(httpServer: HttpServer): FeeduServer {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    socket.on('join:restaurant', (restaurantId) => {
      socket.join(rooms.restaurant(restaurantId));
      socket.join(rooms.kitchen(restaurantId));
    });

    // Brand-wide dashboards watch every branch of their tenant at once.
    socket.on('join:brand', (brandId) => {
      socket.join(rooms.brand(brandId));
    });

    socket.on('join:order', (orderId) => {
      socket.join(rooms.order(orderId));
    });

    socket.on('disconnect', () => logger.debug(`Socket disconnected: ${socket.id}`));
  });

  logger.info('Socket.IO initialized');
  return io;
}

/** Accessor for services that emit realtime events. */
export function getIO(): FeeduServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
