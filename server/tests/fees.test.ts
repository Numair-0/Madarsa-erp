import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ensureDefaultAccounts } from '../src/models/Account';
import { Student } from '../src/models/Student';
import { FeeStructure, FeeObligation } from '../src/models/Fees';
import { Voucher } from '../src/models/Voucher';
import { generateDues, collectPayment, reversePayment } from '../src/services/fees.service';
let rs: MongoMemoryReplSet; let sid: string; let stId: string; const actor = new mongoose.Types.ObjectId().toString();
beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(rs.getUri());
  await Promise.all([Student, FeeObligation, Voucher].map(m => m.syncIndexes())); await ensureDefaultAccounts();
  sid = (await Student.create({ admissionNumber: 'A1', name: 'Zaid', fatherName: 'Omar', dob: new Date('2010-01-01'), gender: 'male' })).id;
  stId = (await FeeStructure.create({ name: 'Tuition', amountPaise: 50000, frequency: 'monthly' })).id;
}, 120000);
afterAll(async () => { await mongoose.disconnect(); await rs?.stop(); });
describe('fees', () => {
  it('generates dues idempotently', async () => {
    expect((await generateDues(stId, '2026-01')).created).toBe(1);
    expect((await generateDues(stId, '2026-01')).created).toBe(0);
  });
  it('partial payment, overpay rejected, balanced voucher, reversal restores dues', async () => {
    const ob = (await FeeObligation.findOne({ student: sid }))!;
    const p = await collectPayment({ studentId: sid, mode: 'cash', allocations: [{ obligationId: ob.id, amountPaise: 20000 }] }, actor);
    expect(p.receiptNumber).toMatch(/^R-\d{4}-00001$/);
    await expect(collectPayment({ studentId: sid, mode: 'cash', allocations: [{ obligationId: ob.id, amountPaise: 40000 }] }, actor)).rejects.toThrow();
    expect((await FeeObligation.findById(ob.id))!.paidPaise).toBe(20000); // rollback intact
    const v = (await Voucher.findById(p.voucher))!;
    expect(v.entries.reduce((a, e) => a + e.debit, 0)).toBe(v.entries.reduce((a, e) => a + e.credit, 0));
    await reversePayment(p.id, 'entered wrongly', actor);
    expect((await FeeObligation.findById(ob.id))!.paidPaise).toBe(0);
    await expect(reversePayment(p.id, 'again', actor)).rejects.toThrow();
  });
});
