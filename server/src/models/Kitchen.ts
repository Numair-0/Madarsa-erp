import { Schema, model } from 'mongoose';
export const DEMAND_STATUS = ['draft', 'submitted', 'approved', 'rejected', 'partially_fulfilled', 'fulfilled', 'closed'] as const;
const line = new Schema({ item: { type: Schema.Types.ObjectId, ref: 'Item', required: true }, qty: { type: Number, required: true, min: 1, validate: Number.isInteger },
  fulfilledQty: { type: Number, default: 0, min: 0 }, priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' } });
const demand = new Schema({ number: { type: String, required: true, unique: true }, kind: { type: String, enum: ['ration', 'equipment'], required: true },
  status: { type: String, enum: DEMAND_STATUS, default: 'draft' }, items: { type: [line], validate: (v: unknown[]) => v.length > 0 },
  neededBy: Date, description: String, reviewNote: String,
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User' }, reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
demand.index({ status: 1, createdAt: -1 });
export const Demand = model('Demand', demand);
export const DailyMenu = model('DailyMenu', new Schema({ date: { type: String, required: true, unique: true }, breakfast: String, lunch: String, dinner: String }, { timestamps: true }));
