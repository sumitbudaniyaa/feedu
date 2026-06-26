import { SOCKET_EVENTS, rooms } from '@feedo/types';
import { Order, Table, TableSession } from '../../models/index.js';
import { getIO } from '../../sockets/index.js';

/** A QR self-seat with no order placed is auto-freed after this long. */
const STALE_QR_MS = 10 * 60 * 1000; // 10 minutes

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
  const updated = await TableSession.updateOne(
    { restaurantId, tableId, status: 'open' },
    { status: 'bill_requested' },
  );
  if (updated.modifiedCount > 0) emitTableUpdated(restaurantId, brandId, tableId);
}

/** Flag a specific session as bill-requested (e.g. when its order is settled). */
export async function requestBillBySession(sessionId: string, brandId?: string | null) {
  const session = await TableSession.findOneAndUpdate(
    { _id: sessionId, status: 'open' },
    { status: 'bill_requested' },
    { new: true },
  );
  if (session) emitTableUpdated(String(session.restaurantId), brandId, String(session.tableId));
}

/**
 * Auto-free QR self-seats that never turned into an order (a curious scan that
 * walked away). Staff-seated tables and any session with a linked order are kept.
 * Run lazily whenever the grid is read — no background job needed.
 */
export async function pruneStaleSessions(restaurantId: string, brandId?: string | null) {
  const cutoff = new Date(Date.now() - STALE_QR_MS);
  const candidates = await TableSession.find({
    restaurantId,
    status: { $in: LIVE },
    openedBy: 'qr',
    openedAt: { $lte: cutoff },
  })
    .select('_id tableId')
    .lean();
  if (!candidates.length) return;

  // Keep any session that actually has an order — only expire the empty ones.
  const withOrders = new Set(
    (await Order.find({ sessionId: { $in: candidates.map((c) => c._id) } }).distinct('sessionId')).map(String),
  );
  const stale = candidates.filter((c) => !withOrders.has(String(c._id)));
  if (!stale.length) return;

  await TableSession.updateMany(
    { _id: { $in: stale.map((s) => s._id) } },
    { status: 'closed', closedAt: new Date() },
  );
  await Table.updateMany(
    { _id: { $in: stale.map((s) => s.tableId) }, restaurantId },
    { status: 'available', reservation: null },
  );
  for (const s of stale) emitTableUpdated(restaurantId, brandId, String(s.tableId));
}

/** All live sessions for a branch — prunes stale QR seats first, then returns the rest. */
export async function getActiveSessions(restaurantId: string, brandId?: string | null) {
  await pruneStaleSessions(restaurantId, brandId);
  return TableSession.find({ restaurantId, status: { $in: LIVE } }).lean();
}
