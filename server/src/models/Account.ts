import { Schema, model } from 'mongoose';
export const ACCOUNT_TYPES = ['asset','liability','income','expense','equity'] as const;
const s = new Schema({ code: { type: String, required: true, unique: true }, name: { type: String, required: true }, type: { type: String, enum: ACCOUNT_TYPES, required: true } }, { timestamps: true });
export const Account = model('Account', s);
export const DEFAULT_ACCOUNTS = [
  { code: 'CASH', name: 'Cash in Hand', type: 'asset' }, { code: 'BANK', name: 'Bank', type: 'asset' },
  { code: 'FEE_INCOME', name: 'Fee Income', type: 'income' }, { code: 'DONATION_INCOME', name: 'Donation Income', type: 'income' },
  { code: 'GENERAL_EXPENSE', name: 'General Expenses', type: 'expense' },
] as const;
export const ensureDefaultAccounts = () => Promise.all(DEFAULT_ACCOUNTS.map(a => Account.updateOne({ code: a.code }, { $setOnInsert: a }, { upsert: true })));
