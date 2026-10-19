import { Schema, model } from 'mongoose';
const entry = new Schema({ account: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  debit: { type: Number, default: 0, min: 0, validate: Number.isInteger }, credit: { type: Number, default: 0, min: 0, validate: Number.isInteger } }, { _id: false });
const s = new Schema({
  number: { type: String, required: true, unique: true }, date: { type: Date, default: Date.now },
  type: { type: String, enum: ['receipt','payment','journal','reversal'], required: true },
  narration: String, entries: { type: [entry], validate: (v: unknown[]) => v.length >= 2 },
  totalPaise: { type: Number, required: true }, reversalOf: { type: Schema.Types.ObjectId, ref: 'Voucher' },
  source: { kind: String, id: String },
}, { timestamps: true });
s.index({ date: -1 }); s.index({ 'source.kind': 1, 'source.id': 1 });
export const Voucher = model('Voucher', s);
