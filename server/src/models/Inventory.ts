import { Schema, model } from 'mongoose';
const int = { type: Number, validate: Number.isInteger };
const item = new Schema({ name: { type: String, required: true, unique: true }, unit: { type: String, required: true }, category: String,
  stockQty: { ...int, default: 0, min: 0 }, // never negative (also enforced by conditional update)
  lowStockThreshold: { ...int, default: 0, min: 0 } }, { timestamps: true });
export const Item = model('Item', item);
const mv = new Schema({ item: { type: Schema.Types.ObjectId, ref: 'Item', required: true }, type: { type: String, enum: ['in', 'out', 'adjust'], required: true },
  delta: { ...int, required: true }, balanceAfter: { ...int, required: true }, reason: String, ref: { kind: String, id: String },
  by: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: { createdAt: true, updatedAt: false } });
mv.index({ item: 1, createdAt: -1 });
export const StockMovement = model('StockMovement', mv);
