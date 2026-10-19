import { Donation, Donor } from '../models/Donation';
import { nextSequence } from '../models/Counter';
import { AppError } from '../utils/errors';
import { postVoucher } from './accounting.service';
import { audit } from './audit.service';
import { tx } from './inventory.service';
export const recordDonation = (i: { donorId: string; category: string; amountPaise: number; mode: 'cash' | 'upi' | 'bank' | 'cheque' | 'other'; purpose?: string; notes?: string }, actor: string) => tx(async s => {
  if (!(await Donor.exists({ _id: i.donorId }).session(s))) throw new AppError(404, 'Donor not found');
  const year = new Date().getFullYear();
  const receiptNumber = `DR-${year}-${String(await nextSequence(`donation:${year}`, s)).padStart(5, '0')}`;
  const v = await postVoucher({ type: 'receipt', narration: `Donation ${receiptNumber}`, source: { kind: 'donation', id: receiptNumber },
    entries: [{ accountCode: i.mode === 'cash' ? 'CASH' : 'BANK', debit: i.amountPaise }, { accountCode: 'DONATION_INCOME', credit: i.amountPaise }] }, s);
  const { donorId, ...rest } = i;
  const [d] = await Donation.create([{ ...rest, donor: donorId, receiptNumber, voucher: v._id, createdBy: actor }], { session: s });
  await audit({ actor, action: 'create', module: 'donations', entity: 'Donation', entityId: d!.id, after: { receiptNumber, amountPaise: i.amountPaise } }, s);
  return d!;
});
