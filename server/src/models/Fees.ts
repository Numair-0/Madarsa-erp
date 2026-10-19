import { Schema, model } from 'mongoose';
export const FREQUENCIES = ['one_time','monthly','quarterly','half_yearly','yearly','custom'] as const;
const structure = new Schema({ name: { type: String, required: true }, amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
  frequency: { type: String, enum: FREQUENCIES, required: true }, active: { type: Boolean, default: true } }, { timestamps: true });
export const FeeStructure = model('FeeStructure', structure);
const ob = new Schema({ student: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, feeStructure: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
  period: { type: String, required: true }, amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
  paidPaise: { type: Number, default: 0, min: 0, validate: Number.isInteger } }, { timestamps: true });
ob.index({ student: 1, feeStructure: 1, period: 1 }, { unique: true }); // idempotent due generation
export const FeeObligation = model('FeeObligation', ob);
const pay = new Schema({ receiptNumber: { type: String, required: true, unique: true }, student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  totalPaise: { type: Number, required: true, min: 1 }, mode: { type: String, enum: ['cash','upi','bank','cheque','other'], required: true },
  allocations: [{ _id: false, obligation: { type: Schema.Types.ObjectId, ref: 'FeeObligation' }, amountPaise: Number }],
  status: { type: String, enum: ['completed','reversed'], default: 'completed' },
  voucher: { type: Schema.Types.ObjectId, ref: 'Voucher' }, reversalVoucher: { type: Schema.Types.ObjectId, ref: 'Voucher' }, reversalReason: String,
  collectedBy: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
pay.index({ student: 1, createdAt: -1 });
export const Payment = model('Payment', pay);
