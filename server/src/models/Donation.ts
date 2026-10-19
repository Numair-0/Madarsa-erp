import { Schema, model } from 'mongoose';
export const Donor = model('Donor', new Schema({ name: { type: String, required: true }, phone: String, address: String }, { timestamps: true }));
const d = new Schema({ receiptNumber: { type: String, required: true, unique: true }, donor: { type: Schema.Types.ObjectId, ref: 'Donor', required: true },
  category: { type: String, required: true }, amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
  mode: { type: String, enum: ['cash', 'upi', 'bank', 'cheque', 'other'], required: true }, purpose: String, notes: String, date: { type: Date, default: Date.now },
  voucher: { type: Schema.Types.ObjectId, ref: 'Voucher' }, createdBy: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
d.index({ date: -1 }); d.index({ donor: 1, date: -1 });
export const Donation = model('Donation', d);
