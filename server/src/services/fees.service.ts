import mongoose from 'mongoose';
import { FeeStructure, FeeObligation, Payment } from '../models/Fees';
import { Student } from '../models/Student';
import { nextSequence } from '../models/Counter';
import { AppError } from '../utils/errors';
import { sumPaise } from '../utils/money';
import { postVoucher, reverseVoucher } from './accounting.service';
import { audit } from './audit.service';
/** Idempotent: unique (student, feeStructure, period) index + upsert. */
export async function generateDues(structureId: string, period: string, studentIds?: string[]) {
  const st = await FeeStructure.findById(structureId);
  if (!st || !st.active) throw new AppError(404, 'Fee structure not found');
  const students = await Student.find({ status: 'active', ...(studentIds ? { _id: { $in: studentIds } } : {}) }).select('_id').lean();
  if (!students.length) return { created: 0 };
  const r = await FeeObligation.bulkWrite(students.map(s => ({ updateOne: {
    filter: { student: s._id, feeStructure: st._id, period }, update: { $setOnInsert: { amountPaise: st.amountPaise, paidPaise: 0 } }, upsert: true } })));
  return { created: r.upsertedCount };
}
export const outstandingDues = (studentId: string) =>
  FeeObligation.find({ student: studentId, $expr: { $lt: ['$paidPaise', '$amountPaise'] } }).sort({ period: 1 }).populate('feeStructure', 'name').lean();
export async function collectPayment(input: { studentId: string; mode: 'cash'|'upi'|'bank'|'cheque'|'other'; allocations: { obligationId: string; amountPaise: number }[] }, actor: string) {
  const ids = input.allocations.map(a => a.obligationId);
  if (new Set(ids).size !== ids.length) throw new AppError(400, 'Duplicate obligation in allocation', 'BAD_ALLOCATION');
  if (input.allocations.some(a => !Number.isInteger(a.amountPaise) || a.amountPaise <= 0)) throw new AppError(400, 'Amounts must be positive integer paise', 'BAD_ALLOCATION');
  const session = await mongoose.startSession();
  try {
    let out: InstanceType<typeof Payment> | undefined;
    await session.withTransaction(async () => {
      for (const a of input.allocations) {
        // Conditional update: never overpay, safe under concurrency.
        const r = await FeeObligation.updateOne({ _id: a.obligationId, student: input.studentId, $expr: { $lte: [{ $add: ['$paidPaise', a.amountPaise] }, '$amountPaise'] } },
          { $inc: { paidPaise: a.amountPaise } }, { session });
        if (r.modifiedCount !== 1) throw new AppError(422, `Allocation rejected for ${a.obligationId} (not found, wrong student, or exceeds due)`, 'BAD_ALLOCATION');
      }
      const total = sumPaise(input.allocations.map(a => a.amountPaise));
      const year = new Date().getFullYear();
      const receiptNumber = `R-${year}-${String(await nextSequence(`receipt:${year}`, session)).padStart(5, '0')}`;
      const cashAcc = input.mode === 'cash' ? 'CASH' : 'BANK';
      const v = await postVoucher({ type: 'receipt', narration: `Fee receipt ${receiptNumber}`, source: { kind: 'receipt', id: receiptNumber },
        entries: [{ accountCode: cashAcc, debit: total }, { accountCode: 'FEE_INCOME', credit: total }] }, session);
      const [p] = await Payment.create([{ receiptNumber, student: input.studentId, totalPaise: total, mode: input.mode, voucher: v._id, collectedBy: actor,
        allocations: input.allocations.map(a => ({ obligation: a.obligationId, amountPaise: a.amountPaise })) }], { session });
      await audit({ actor, action: 'collect', module: 'fees', entity: 'Payment', entityId: p!.id, after: { receiptNumber, total } }, session);
      out = p;
    });
    return out!;
  } finally { await session.endSession(); }
}
export async function reversePayment(paymentId: string, reason: string, actor: string) {
  const session = await mongoose.startSession();
  try {
    let out: InstanceType<typeof Payment> | undefined;
    await session.withTransaction(async () => {
      // Atomic state transition prevents double reversal.
      const p = await Payment.findOneAndUpdate({ _id: paymentId, status: 'completed' }, { status: 'reversed', reversalReason: reason }, { new: true, session });
      if (!p) throw new AppError(409, 'Payment not found or already reversed', 'INVALID_TRANSITION');
      for (const a of p.allocations) await FeeObligation.updateOne({ _id: a.obligation }, { $inc: { paidPaise: -(a.amountPaise ?? 0) } }, { session });
      const rv = await reverseVoucher(p.voucher!, `Reversal of ${p.receiptNumber}: ${reason}`, session);
      p.reversalVoucher = rv._id; await p.save({ session });
      await audit({ actor, action: 'reverse', module: 'fees', entity: 'Payment', entityId: p.id, meta: { reason } }, session);
      out = p;
    });
    return out!;
  } finally { await session.endSession(); }
}
export const getPayment = async (id: string) => {
  const p = await Payment.findById(id).populate('student', 'name fatherName admissionNumber')
    .populate({ path: 'allocations.obligation', select: 'period feeStructure', populate: { path: 'feeStructure', select: 'name' } }).lean();
  if (!p) throw new AppError(404, 'Payment not found');
  return p;
};
