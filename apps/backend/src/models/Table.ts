import { Schema, model, type InferSchemaType } from 'mongoose';

const reservationSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    partySize: { type: Number },
    time: { type: String },
    note: { type: String },
  },
  { _id: false },
);

const tableSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    qrToken: { type: String, required: true, unique: true, index: true },
    seats: { type: Number, default: 2 },
    isActive: { type: Boolean, default: true },
    // Live seat-occupancy state + optional reservation details.
    status: { type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' },
    reservation: { type: reservationSchema, default: null },
  },
  { timestamps: true },
);

export type TableDoc = InferSchemaType<typeof tableSchema>;
export const Table = model('Table', tableSchema);
