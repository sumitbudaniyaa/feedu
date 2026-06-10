import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@feedo/types';

export type FeedoSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Create a (lazy) Socket.IO connection. Call `.connect()` when ready. */
export function createSocket(url: string): FeedoSocket {
  return io(url, { autoConnect: false, transports: ['websocket'] });
}
