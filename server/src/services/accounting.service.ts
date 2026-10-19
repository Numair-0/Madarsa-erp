import { ClientSession, Types } from 'mongoose';
import { Account } from '../models/Account';
import { Voucher } from '../models/Voucher';
import { nextSequence } from '../models/Counter';
import { AppError } from '../utils/errors';
import { sumPaise } from '../utils/money';
export interface EntryInput { accountCode: string; debit?: number; credit?: number }
/** Posts a balanced voucher. Must be called with a session inside a transaction. */
export async function postVoucher(v: { type: 'receipt'|'payment'|'journal'|'reversal'; narration?: string; entries: EntryInput[]; source?: { kind: string; id: string }; reversalOf?: Types.ObjectId }, session: ClientSession) {
  for (const e of v.entries) {
    const d = e.debit ?? 0, c = e.credit ?? 0;
    if (!Number.isInteger(d) || !Number.isInteger(c) || d < 0 || c < 0 || (d > 0) === (c > 0))
      throw new AppError(400, 'Each entry needs exactly one positive integer debit or credit', 'BAD_ENTRY');
  }
  const debit = sumPaise(v.entries.map(e => e.debit ?? 0)), credit = sumPaise(v.entries.map(e => e.credit ?? 0));
  if (debit !== credit) throw new AppError(400, `Voucher unbalanced: debit ${debit} != credit ${credit}`, 'UNBALANCED');
  const accounts = await Account.find({ code: { $in: v.entries.map(e => e.accountCode) } }).session(session);
  const byCode = new Map(accounts.map(a => [a.code, a._id]));
  const entries = v.entries.map(e => {
    const account = byCode.get(e.accountCode);
    if (!account) throw new AppError(400, `Unknown account ${e.accountCode}`, 'UNKNOWN_ACCOUNT');
    return { account, debit: e.debit ?? 0, credit: e.credit ?? 0 };
  });
  const year = new Date().getFullYear();
  const number = `V-${year}-${String(await nextSequence(`voucher:${year}`, session)).padStart(5, '0')}`;
  const [doc] = await Voucher.create([{ number, type: v.type, narration: v.narration, entries, totalPaise: debit, source: v.source, reversalOf: v.reversalOf }], { session });
  return doc!;
}
/** Vouchers are immutable; corrections post a mirror voucher. */
export async function reverseVoucher(id: Types.ObjectId, narration: string, session: ClientSession) {
  const orig = await Voucher.findById(id).session(session);
  if (!orig) throw new AppError(404, 'Voucher not found');
  if (orig.reversalOf) throw new AppError(409, 'Cannot reverse a reversal', 'INVALID_TRANSITION');
  const accs = await Account.find({ _id: { $in: orig.entries.map(e => e.account) } }).session(session);
  const code = new Map(accs.map(a => [a.id as string, a.code]));
  return postVoucher({ type: 'reversal', narration, reversalOf: orig._id,
    entries: orig.entries.map(e => ({ accountCode: code.get(String(e.account))!, debit: e.credit, credit: e.debit })) }, session);
}
