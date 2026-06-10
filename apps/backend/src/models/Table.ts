import { Schema, model, type InferSchemaType } from 'mongoose';

const tableSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    qrToken: { type: String, required: true, unique: true, index: true },
    seats: { type: Number, default: 2 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type TableDoc = InferSchemaType<typeof tableSchema>;
export const Table = model('Table', tableSchema);
