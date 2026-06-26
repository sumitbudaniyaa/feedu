import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * A single party's visit to a table — from seating to settlement. A table is
 * "occupied" exactly when it has an OPEN (or bill_requested) session; orders link
 * to a session by id (no name matching). Opened by staff (one-tap seat) or by a
 * customer scanning the table QR.
 */
const tableSessionSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true, index: true },
    status: { type: String, enum: ['open', 'bill_requested', 'closed'], default: 'open' },
    partySize: { type: Number },
    openedBy: { type: String, enum: ['qr', 'staff'], default: 'staff' },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

// Fast lookup of the live session for a table.
tableSessionSchema.index({ restaurantId: 1, tableId: 1, status: 1 });

export type TableSessionDoc = InferSchemaType<typeof tableSessionSchema>;
export const TableSession = model('TableSession', tableSessionSchema);
