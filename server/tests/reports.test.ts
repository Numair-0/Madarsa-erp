import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Student } from '../src/models/Student';
import { FeeStructure, FeeObligation } from '../src/models/Fees';
import { Voucher } from '../src/models/Voucher';
import { ensureDefaultAccounts } from '../src/models/Account';
import { generateDues, collectPayment } from '../src/services/fees.service';
import { feeCollection, trialBalance, defaulters, accountLedger } from '../src/services/reports.service';
import { dashboard } from '../src/services/dashboard.service';
let rs: MongoMemoryReplSet; const actor = new mongoose.Types.ObjectId().toString(); const wide = { from: new Date(0), to: new Date(Date.now() + 86400000) };
beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(rs.getUri());
  await Promise.all([Student, FeeObligation, Voucher].map(m => m.syncIndexes())); await ensureDefaultAccounts();
  await Student.create([{ admissionNumber: 'A', name: 'A', fatherName: 'F', dob: new Date('2010-01-01'), gender: 'male' }, { admissionNumber: 'B', name: 'B', fatherName: 'F', dob: new Date('2010-01-02'), gender: 'male' }]);
  const st = await FeeStructure.create({ name: 'Tuition', amountPaise: 30000, frequency: 'monthly' });
  await generateDues(st.id, '2026-02');
  const ob = (await FeeObligation.findOne({}).populate('student'))!;
  await collectPayment({ studentId: String(ob.student._id ?? ob.student), mode: 'cash', allocations: [{ obligationId: ob.id, amountPaise: 10000 }] }, actor);
}, 120000);
afterAll(async () => { await mongoose.disconnect(); await rs?.stop(); });
describe('reports + dashboard (real data)', () => {
  it('fee collection, defaulters, trial balance, ledger agree', async () => {
    expect((await feeCollection(wide)).reduce((a, x) => a + x.totalPaise, 0)).toBe(10000);
    expect((await defaulters(1, 10)).length).toBe(2);
    const tb = await trialBalance(); expect(tb.balanced).toBe(true);
    expect((await accountLedger('CASH', wide)).closingPaise).toBe(10000);
  });
  it('dashboard is role-aware and computed from data', async () => {
    const d = await dashboard('admin') as any;
    expect(d.students.total).toBe(2); expect(d.fees.outstandingPaise).toBe(50000);
    const t = await dashboard('teacher') as any; expect(t.fees).toBeUndefined();
  });
});
