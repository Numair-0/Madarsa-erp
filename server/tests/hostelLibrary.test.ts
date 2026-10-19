import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Student } from '../src/models/Student';
import { Hostel, Room, Bed, Allocation } from '../src/models/Hostel';
import { BookTitle, BookCopy, Issue } from '../src/models/Library';
import { allocateBed, transferStudent } from '../src/services/hostel.service';
import { issueBook, returnBook, FINE_PER_DAY_PAISE } from '../src/services/library.service';
let rs: MongoMemoryReplSet; const actor = new mongoose.Types.ObjectId().toString(); const ids: string[] = []; const beds: string[] = [];
beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(rs.getUri());
  await Promise.all([Student, Allocation, Issue, BookCopy].map(m => m.syncIndexes()));
  for (const n of ['A', 'B']) ids.push((await Student.create({ admissionNumber: n, name: n + 'name', fatherName: 'F', dob: new Date('2010-01-01'), gender: 'male' })).id);
  const h = await Hostel.create({ name: 'Main' }); const r = await Room.create({ hostel: h._id, number: '1' });
  for (const l of ['1', '2', '3']) beds.push((await Bed.create({ room: r._id, label: l })).id);
  const t = await BookTitle.create({ title: 'Book' }); await BookCopy.create({ title: t._id, accessionNumber: 'ACC1' });
}, 120000);
afterAll(async () => { await mongoose.disconnect(); await rs?.stop(); });
describe('hostel', () => {
  it('blocks double bed / double student, supports transfer', async () => {
    await allocateBed(ids[0]!, beds[0]!, actor);
    await expect(allocateBed(ids[1]!, beds[0]!, actor)).rejects.toThrow();
    await expect(allocateBed(ids[0]!, beds[1]!, actor)).rejects.toThrow();
    await transferStudent(ids[0]!, beds[1]!, actor);
    expect(await Allocation.countDocuments({ student: ids[0], status: 'active' })).toBe(1);
    await allocateBed(ids[1]!, beds[0]!, actor); // freed by transfer
  });
});
describe('library', () => {
  it('issues once, computes fine on late return', async () => {
    const t0 = new Date('2026-01-01');
    await issueBook('ACC1', ids[0]!, actor, t0);
    await expect(issueBook('ACC1', ids[1]!, actor, t0)).rejects.toThrow();
    const r = await returnBook('ACC1', 'good', actor, new Date('2026-01-18')); // due Jan 15 -> 3 days late
    expect(r.finePaise).toBe(3 * FINE_PER_DAY_PAISE);
    await expect(returnBook('ACC1', 'good', actor)).rejects.toThrow();
    await issueBook('ACC1', ids[1]!, actor); // available again
  });
});
