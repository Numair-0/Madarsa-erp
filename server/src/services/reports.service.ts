import { Types } from 'mongoose';
import { Payment, FeeObligation } from '../models/Fees';
import { Voucher } from '../models/Voucher';
import { Account } from '../models/Account';
import { Donation, Donor } from '../models/Donation';
import { Issue } from '../models/Library';
import { AppError } from '../utils/errors';
export interface Range { from: Date; to: Date }
const TZ = 'Asia/Kolkata';
const dayExpr = (f: string, field: string) => ({ $dateToString: { format: f, date: field, timezone: TZ } });
export const feeCollection = (r: Range, by: 'day' | 'month' = 'day') => Payment.aggregate<{ _id: string; totalPaise: number; receipts: number }>([
  { $match: { status: 'completed', createdAt: { $gte: r.from, $lte: r.to } } },
  { $group: { _id: dayExpr(by === 'day' ? '%Y-%m-%d' : '%Y-%m', '$createdAt'), totalPaise: { $sum: '$totalPaise' }, receipts: { $sum: 1 } } },
  { $sort: { _id: 1 } }]);
export const defaulters = (page: number, limit: number) => FeeObligation.aggregate([
  { $match: { $expr: { $lt: ['$paidPaise', '$amountPaise'] } } },
  { $group: { _id: '$student', duePaise: { $sum: { $subtract: ['$amountPaise', '$paidPaise'] } }, periods: { $sum: 1 } } },
  { $sort: { duePaise: -1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit },
  { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 's' } }, { $unwind: '$s' },
  { $project: { duePaise: 1, periods: 1, name: '$s.name', admissionNumber: '$s.admissionNumber' } }]);
export async function studentLedger(studentId: string) {
  const [obligations, payments] = await Promise.all([FeeObligation.find({ student: studentId }).sort({ period: 1 }).lean(), Payment.find({ student: studentId }).sort({ createdAt: 1 }).lean()]);
  const billed = obligations.reduce((a, o) => a + o.amountPaise, 0), paid = obligations.reduce((a, o) => a + o.paidPaise, 0);
  return { obligations, payments, billedPaise: billed, paidPaise: paid, outstandingPaise: billed - paid };
}
export const daybook = (r: Range) => Voucher.find({ date: { $gte: r.from, $lte: r.to } }).sort({ date: 1, number: 1 }).lean();
export async function accountLedger(code: string, r: Range) {
  const acc = await Account.findOne({ code });
  if (!acc) throw new AppError(404, 'Account not found');
  const rows = await Voucher.aggregate<{ number: string; date: Date; narration?: string; debit: number; credit: number }>([
    { $match: { date: { $gte: r.from, $lte: r.to }, 'entries.account': acc._id } }, { $unwind: '$entries' }, { $match: { 'entries.account': acc._id } },
    { $project: { _id: 0, number: 1, date: 1, narration: 1, debit: '$entries.debit', credit: '$entries.credit' } }, { $sort: { date: 1, number: 1 } }]);
  let bal = 0; // running balance = cumulative debit - credit (integer paise)
  return { account: { code: acc.code, name: acc.name, type: acc.type }, rows: rows.map(x => ({ ...x, balancePaise: (bal += x.debit - x.credit) })), closingPaise: bal };
}
export async function trialBalance() {
  const rows = await Voucher.aggregate<{ code: string; name: string; debit: number; credit: number }>([
    { $unwind: '$entries' }, { $group: { _id: '$entries.account', debit: { $sum: '$entries.debit' }, credit: { $sum: '$entries.credit' } } },
    { $lookup: { from: 'accounts', localField: '_id', foreignField: '_id', as: 'a' } }, { $unwind: '$a' },
    { $project: { _id: 0, code: '$a.code', name: '$a.name', debit: 1, credit: 1 } }, { $sort: { code: 1 } }]);
  const totalDebit = rows.reduce((a, x) => a + x.debit, 0), totalCredit = rows.reduce((a, x) => a + x.credit, 0);
  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}
export type DonationGroup = 'day' | 'month' | 'year' | 'donor' | 'category' | 'mode';
export async function donationReport(by: DonationGroup, r: Range) {
  const key = { day: dayExpr('%Y-%m-%d', '$date'), month: dayExpr('%Y-%m', '$date'), year: dayExpr('%Y', '$date'), donor: '$donor', category: '$category', mode: '$mode' }[by];
  const rows = await Donation.aggregate<{ _id: unknown; totalPaise: number; count: number; label?: string }>([
    { $match: { date: { $gte: r.from, $lte: r.to } } }, { $group: { _id: key, totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  if (by === 'donor') {
    const donors = await Donor.find({ _id: { $in: rows.map(x => x._id as Types.ObjectId) } }).select('name').lean();
    const names = new Map(donors.map(d => [String(d._id), d.name]));
    rows.forEach(x => { x.label = names.get(String(x._id)) ?? 'Unknown'; });
  }
  return rows;
}
export const libraryFines = (r: Range) => Issue.find({ finePaise: { $gt: 0 }, returnedAt: { $gte: r.from, $lte: r.to } }).populate('copy student', 'accessionNumber name admissionNumber').lean();
