import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Item } from '../src/models/Inventory';
import { Voucher } from '../src/models/Voucher';
import { Donor, Donation } from '../src/models/Donation';
import { ensureDefaultAccounts } from '../src/models/Account';
import { recordMovement } from '../src/services/inventory.service';
import { createDemand, transition, fulfill } from '../src/services/kitchen.service';
import { recordDonation } from '../src/services/donation.service';
let rs: MongoMemoryReplSet; const actor = new mongoose.Types.ObjectId().toString(); let rice: string;
beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(rs.getUri());
  await Promise.all([Item, Voucher, Donation].map(m => m.syncIndexes())); await ensureDefaultAccounts();
  rice = (await Item.create({ name: 'Rice', unit: 'kg', lowStockThreshold: 5 })).id;
}, 120000);
afterAll(async () => { await mongoose.disconnect(); await rs?.stop(); });
describe('inventory + kitchen', () => {
  it('prevents negative stock and keeps ledger', async () => {
    await recordMovement(rice, 'in', 10, actor);
    await expect(recordMovement(rice, 'out', 11, actor)).rejects.toThrow('Insufficient');
    expect((await Item.findById(rice))!.stockQty).toBe(10);
  });
  it('demand workflow with partial fulfilment', async () => {
    const d = await createDemand({ kind: 'ration', items: [{ item: rice, qty: 8 }] }, actor);
    await expect(transition(d.id, 'approve', actor)).rejects.toThrow(); // draft cannot be approved
    await transition(d.id, 'submit', actor); await transition(d.id, 'approve', actor);
    expect((await fulfill(d.id, [{ itemId: rice, qty: 5 }], actor)).status).toBe('partially_fulfilled');
    await expect(fulfill(d.id, [{ itemId: rice, qty: 5 }], actor)).rejects.toThrow(); // stock 5 left, demand needs only 3 more
    expect((await fulfill(d.id, [{ itemId: rice, qty: 3 }], actor)).status).toBe('fulfilled');
    expect((await Item.findById(rice))!.stockQty).toBe(2);
  });
});
describe('donations', () => {
  it('issues receipt and posts balanced voucher', async () => {
    const donor = await Donor.create({ name: 'Haji Sahab' });
    const d = await recordDonation({ donorId: donor.id, category: 'Zakat', amountPaise: 123456, mode: 'upi' }, actor);
    expect(d.receiptNumber).toMatch(/^DR-\d{4}-00001$/);
    const v = (await Voucher.findById(d.voucher))!;
    expect(v.entries.reduce((a, e) => a + e.debit, 0)).toBe(123456);
  });
});
