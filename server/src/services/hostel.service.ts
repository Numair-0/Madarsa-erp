import mongoose from 'mongoose';
import { Allocation, Bed } from '../models/Hostel';
import { Student } from '../models/Student';
import { AppError } from '../utils/errors';
import { audit } from './audit.service';
async function tx<T>(fn: (s: mongoose.ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try { let r!: T; await session.withTransaction(async () => { r = await fn(session); }); return r; } finally { await session.endSession(); }
}
async function assertAllocatable(studentId: string, bedId: string, s: mongoose.ClientSession) {
  const [st, bed] = await Promise.all([Student.findById(studentId).session(s), Bed.findById(bedId).session(s)]);
  if (!st || st.status !== 'active') throw new AppError(422, 'Student not found or not active', 'BAD_STUDENT');
  if (!bed) throw new AppError(404, 'Bed not found');
  if (await Allocation.exists({ bed: bedId, status: 'active' }).session(s)) throw new AppError(409, 'Bed already occupied', 'BED_OCCUPIED');
}
export const allocateBed = (studentId: string, bedId: string, actor: string) => tx(async s => {
  if (await Allocation.exists({ student: studentId, status: 'active' }).session(s)) throw new AppError(409, 'Student already has an active bed', 'STUDENT_ALLOCATED');
  await assertAllocatable(studentId, bedId, s);
  const [a] = await Allocation.create([{ student: studentId, bed: bedId, allocatedBy: actor }], { session: s });
  await audit({ actor, action: 'allocate', module: 'hostel', entity: 'Allocation', entityId: a!.id, after: { studentId, bedId } }, s);
  return a!;
});
export const transferStudent = (studentId: string, newBedId: string, actor: string) => tx(async s => {
  await assertAllocatable(studentId, newBedId, s);
  const old = await Allocation.findOneAndUpdate({ student: studentId, status: 'active' }, { status: 'released', releasedAt: new Date(), releaseReason: 'transfer' }, { session: s });
  if (!old) throw new AppError(409, 'Student has no active allocation', 'INVALID_TRANSITION');
  const [a] = await Allocation.create([{ student: studentId, bed: newBedId, allocatedBy: actor }], { session: s });
  await audit({ actor, action: 'transfer', module: 'hostel', entity: 'Allocation', entityId: a!.id, before: { bed: old.bed }, after: { bed: newBedId } }, s);
  return a!;
});
export const releaseStudent = (studentId: string, reason: string, actor: string) => tx(async s => {
  const a = await Allocation.findOneAndUpdate({ student: studentId, status: 'active' }, { status: 'released', releasedAt: new Date(), releaseReason: reason }, { new: true, session: s });
  if (!a) throw new AppError(409, 'Student has no active allocation', 'INVALID_TRANSITION');
  await audit({ actor, action: 'release', module: 'hostel', entity: 'Allocation', entityId: a.id, meta: { reason } }, s);
  return a;
});
export async function occupancy() {
  const [totalBeds, occupied] = await Promise.all([Bed.countDocuments(), Allocation.countDocuments({ status: 'active' })]);
  return { totalBeds, occupied, vacant: totalBeds - occupied };
}
