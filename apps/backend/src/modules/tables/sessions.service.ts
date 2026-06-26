import { SOCKET_EVENTS, rooms } from '@feedo/types';
import { Table, TableSession } from '../../models/index.js';
import { getIO } from '../../sockets/index.js';

type Io = { to: (room: string) => { emit: (e: string, p: unknown) => void } };

/** Live-sync the seat grid for everyone watching this branch + brand. */
export function emitTableUpdated(restaurantId: string, brandId?: string | null, tableId?: string) {
  const io = getIO() as unknown as Io;
  const payload = { tableId: tableId ?? '' };
  io.to(rooms.restaurant(restaurantId)).emit(SOCKET_EVENTS.TABLE_UPDATED, payload);
  if (brandId) io.to(rooms.brand(brandId)).emit(SOCKET_EVENTS.TABLE_UPDATED, payload);
}

const LIVE = ['open', 'bill_requested'];

/**
 * Find the live session for a table, or open one (idempotent "seat / join").
 * Arriving at a reserved table converts it: the reservation hold is cleared.
 */
export async function ensureSession(
  restaurantId: string,
  tableId: string,
  opts: { brandId?: string | null; openedBy: 'qr' | 'staff'; partySize?: number },
) {
  const existing = await TableSession.findOne({ restaurantId, tableId, status: { $in: LIVE } });
  if (existing) {
    if (opts.partySize && !existing.partySize) {
      existing.partySize = opts.partySize;
      await existing.save();
    }
    return existing;
  }
  const session = await TableSession.create({
    restaurantId,
    brandId: opts.brandId ?? undefined,
    tableId,
    openedBy: opts.openedBy,
    partySize: opts.partySize,
    status: 'open',
  });
  // Clear any reservation hold now the party is seated.
  await Table.updateOne({ _id: tableId, restaurantId }, { status: 'available', reservation: null });
  emitTableUpdated(restaurantId, opts.brandId, tableId);
  return session;
}

/** Close the table's live session (settle / free). Frees the table. */
export async function closeSession(restaurantId: string, tableId: string, brandId?: string | null) {
  await TableSession.updateMany(
    { restaurantId, tableId, status: { $in: LIVE } },
    { status: 'closed', closedAt: new Date() },
  );
  await Table.updateOne({ _id: tableId, restaurantId }, { status: 'available', reservation: null });
  emitTableUpdated(restaurantId, brandId, tableId);
}

/** Flag the table's live session as bill-requested (still occupied). */
export async function requestBill(restaurantId: string, tableId: string, brandId?: string | null) {
  await TableSession.updateOne(
    { restaurantId, tableId, status: 'open' },
    { status: 'bill_requested' },
  );
  emitTableUpdated(restaurantId, brandId, tableId);
}

/** All live sessions for a branch — the grid joins these to its tables by id. */
export function getActiveSessions(restaurantId: string) {
  return TableSession.find({ restaurantId, status: { $in: LIVE } }).lean();
}
