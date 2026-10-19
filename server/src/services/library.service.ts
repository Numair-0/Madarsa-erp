import mongoose from 'mongoose';
import { BookCopy, Issue } from '../models/Library';
import { Student } from '../models/Student';
import { AppError } from '../utils/errors';
import { audit } from './audit.service';
export const FINE_PER_DAY_PAISE = 500, LOAN_DAYS = 14, LOST_FINE_PAISE = 50000;
async function tx<T>(fn: (s: mongoose.ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try { let r!: T; await session.withTransaction(async () => { r = await fn(session); }); return r; } finally { await session.endSession(); }
}
export const issueBook = (accession: string, studentId: string, actor: string, now = new Date()) => tx(async s => {
  const st = await Student.findById(studentId).session(s);
  if (!st || st.status !== 'active') throw new AppError(422, 'Student not found or not active', 'BAD_STUDENT');
  // Atomic availability claim: only one concurrent issue can flip available -> issued.
  const copy = await BookCopy.findOneAndUpdate({ accessionNumber: accession, status: 'available' }, { status: 'issued' }, { new: true, session: s });
  if (!copy) throw new AppError(409, 'Copy not found or not available', 'COPY_UNAVAILABLE');
  const due = new Date(now.getTime() + LOAN_DAYS * 86400000);
  const [i] = await Issue.create([{ copy: copy._id, student: studentId, issuedAt: now, dueDate: due, issuedBy: actor }], { session: s });
  await audit({ actor, action: 'issue', module: 'library', entity: 'Issue', entityId: i!.id, after: { accession, studentId } }, s);
  return i!;
});
export const returnBook = (accession: string, condition: 'good' | 'damaged' | 'lost', actor: string, now = new Date()) => tx(async s => {
  const copy = await BookCopy.findOne({ accessionNumber: accession }).session(s);
  if (!copy) throw new AppError(404, 'Copy not found');
  const issue = await Issue.findOne({ copy: copy._id, status: 'issued' }).session(s);
  if (!issue) throw new AppError(409, 'Copy is not currently issued', 'INVALID_TRANSITION');
  const lateDays = Math.max(0, Math.ceil((now.getTime() - issue.dueDate.getTime()) / 86400000));
  const finePaise = lateDays * FINE_PER_DAY_PAISE + (condition === 'lost' ? LOST_FINE_PAISE : 0);
  const done = await Issue.findOneAndUpdate({ _id: issue._id, status: 'issued' }, { status: condition === 'lost' ? 'lost' : 'returned', returnedAt: now, finePaise, condition }, { new: true, session: s });
  if (!done) throw new AppError(409, 'Already returned', 'INVALID_TRANSITION');
  copy.status = condition === 'good' ? 'available' : condition; await copy.save({ session: s });
  await audit({ actor, action: 'return', module: 'library', entity: 'Issue', entityId: done.id, meta: { condition, finePaise } }, s);
  return done;
});
export const overdueIssues = (now = new Date()) => Issue.find({ status: 'issued', dueDate: { $lt: now } }).populate('copy student', 'accessionNumber name admissionNumber').lean();
