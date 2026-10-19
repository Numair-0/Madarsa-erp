import mongoose from 'mongoose';
import { Enrollment, Exam, Mark, Subject, Section, GradeRule, DEFAULT_BANDS, CorrectionRequest, ClassLevel } from '../models/Academics';
import { Student } from '../models/Student';
import { AppError } from '../utils/errors';
import { audit } from './audit.service';
import { tx } from './inventory.service';
const eq = (a: unknown, b: unknown) => String(a) === String(b);
export async function enrollStudent(i: { studentId: string; sessionId: string; classId: string; sectionId?: string | undefined }, actor: string) {
  const st = await Student.findById(i.studentId);
  if (!st || st.status !== 'active') throw new AppError(422, 'Student not found or not active', 'BAD_STUDENT');
  if (!(await ClassLevel.exists({ _id: i.classId }))) throw new AppError(404, 'Class not found');
  if (i.sectionId) { const sec = await Section.findById(i.sectionId); if (!sec || !eq(sec.classLevel, i.classId)) throw new AppError(422, 'Section does not belong to class', 'BAD_SECTION'); }
  if (await Enrollment.exists({ student: i.studentId, session: i.sessionId, status: 'active' })) throw new AppError(409, 'Student already enrolled in this session', 'ALREADY_ENROLLED');
  const e = await Enrollment.create({ student: i.studentId, session: i.sessionId, classLevel: i.classId, section: i.sectionId });
  await audit({ actor, action: 'enroll', module: 'students', entity: 'Enrollment', entityId: e.id, after: i });
  return e;
}
export async function createExam(i: { name: string; sessionId: string; classId: string; subjects: { subjectId: string; maxMarks: number; passMarks: number }[] }, actor: string) {
  const subs = await Subject.find({ _id: { $in: i.subjects.map(s => s.subjectId) } });
  if (subs.length !== new Set(i.subjects.map(s => s.subjectId)).size || subs.some(s => !eq(s.classLevel, i.classId))) throw new AppError(422, 'Subjects must be distinct and belong to the class', 'BAD_SUBJECTS');
  if (i.subjects.some(s => s.passMarks > s.maxMarks)) throw new AppError(422, 'passMarks cannot exceed maxMarks', 'BAD_MARKS');
  const e = await Exam.create({ name: i.name, session: i.sessionId, classLevel: i.classId, subjects: i.subjects.map(s => ({ subject: s.subjectId, maxMarks: s.maxMarks, passMarks: s.passMarks })) });
  await audit({ actor, action: 'create', module: 'results', entity: 'Exam', entityId: e.id });
  return e;
}
const getExam = async (id: string) => { const e = await Exam.findById(id); if (!e) throw new AppError(404, 'Exam not found'); return e; };
export async function enterMarks(examId: string, entries: { studentId: string; subjectId: string; obtained?: number | undefined; absent?: boolean | undefined }[], actor: string) {
  const exam = await getExam(examId);
  if (exam.status === 'finalized') throw new AppError(409, 'Results are finalized; use the correction workflow', 'FINALIZED');
  const enrolled = new Set((await Enrollment.find({ session: exam.session, classLevel: exam.classLevel, status: 'active' }).select('student').lean()).map(e => String(e.student)));
  for (const en of entries) {
    const line = exam.subjects.find(s => eq(s.subject, en.subjectId));
    if (!line) throw new AppError(422, 'Subject not in exam', 'BAD_MARKS');
    if (!enrolled.has(en.studentId)) throw new AppError(422, 'Student is not enrolled in this exam\'s class', 'BAD_STUDENT');
    const v = en.absent ? 0 : en.obtained;
    if (v === undefined || !Number.isInteger(v) || v < 0 || v > line.maxMarks) throw new AppError(422, `Marks must be an integer between 0 and ${line.maxMarks}`, 'BAD_MARKS');
  }
  await Mark.bulkWrite(entries.map(en => ({ updateOne: { filter: { exam: exam._id, student: new mongoose.Types.ObjectId(en.studentId), subject: new mongoose.Types.ObjectId(en.subjectId) },
    update: { $set: { obtained: en.absent ? 0 : en.obtained!, absent: !!en.absent, enteredBy: new mongoose.Types.ObjectId(actor) } }, upsert: true } })));
  await audit({ actor, action: 'marks_entry', module: 'results', entity: 'Exam', entityId: examId, meta: { count: entries.length } });
  return { saved: entries.length };
}
/** Integer math only: percentage kept as basis points (percent*100). */
export async function computeResults(examId: string) {
  const exam = await getExam(examId);
  const bands = ((await GradeRule.findOne({ key: 'main' }).lean())?.bands?.length ? (await GradeRule.findOne({ key: 'main' }).lean())!.bands : DEFAULT_BANDS).slice().sort((a, b) => (b.minPercent ?? 0) - (a.minPercent ?? 0));
  const marks = await Mark.find({ exam: examId }).lean(); const maxTotal = exam.subjects.reduce((a, s) => a + s.maxMarks, 0);
  const byStudent = new Map<string, typeof marks>(); for (const m of marks) { const k = String(m.student); byStudent.set(k, [...(byStudent.get(k) ?? []), m]); }
  const students = await Student.find({ _id: { $in: [...byStudent.keys()] } }).select('name admissionNumber').lean();
  return students.map(st => {
    const ms = byStudent.get(String(st._id))!; const total = ms.reduce((a, m) => a + m.obtained, 0);
    const complete = exam.subjects.every(s => ms.some(m => eq(m.subject, s.subject)));
    const passed = complete && exam.subjects.every(s => { const m = ms.find(x => eq(x.subject, s.subject))!; return !m.absent && m.obtained >= s.passMarks; });
    const percentBp = Math.floor(total * 10000 / maxTotal); const grade = bands.find(b => percentBp >= (b.minPercent ?? 0) * 100)?.grade ?? 'F';
    return { studentId: st._id, name: st.name, admissionNumber: st.admissionNumber, total, maxTotal, percentBp, grade: passed ? grade : 'F', passed, complete };
  }).sort((a, b) => b.percentBp - a.percentBp);
}
export async function finalizeExam(examId: string, actor: string) {
  const exam = await getExam(examId);
  const enrolled = (await Enrollment.find({ session: exam.session, classLevel: exam.classLevel, status: 'active' }).select('student').lean()).map(e => e.student);
  const have = await Mark.countDocuments({ exam: examId, student: { $in: enrolled } });
  if (!enrolled.length || have !== enrolled.length * exam.subjects.length) throw new AppError(422, 'Marks are incomplete for enrolled students', 'INCOMPLETE');
  const done = await Exam.findOneAndUpdate({ _id: examId, status: 'draft' }, { status: 'finalized', finalizedAt: new Date(), finalizedBy: actor }, { new: true });
  if (!done) throw new AppError(409, 'Already finalized', 'INVALID_TRANSITION');
  await audit({ actor, action: 'finalize', module: 'results', entity: 'Exam', entityId: examId });
  return done;
}
export async function requestCorrection(examId: string, i: { studentId: string; subjectId: string; newMarks: number; reason: string }, actor: string) {
  const exam = await getExam(examId);
  if (exam.status !== 'finalized') throw new AppError(409, 'Exam is not finalized; edit marks directly', 'INVALID_TRANSITION');
  const line = exam.subjects.find(s => eq(s.subject, i.subjectId)); const mark = await Mark.findOne({ exam: examId, student: i.studentId, subject: i.subjectId });
  if (!line || !mark) throw new AppError(404, 'Mark not found');
  if (!Number.isInteger(i.newMarks) || i.newMarks < 0 || i.newMarks > line.maxMarks) throw new AppError(422, `Marks must be 0..${line.maxMarks}`, 'BAD_MARKS');
  const r = await CorrectionRequest.create({ exam: examId, student: i.studentId, subject: i.subjectId, oldMarks: mark.obtained, newMarks: i.newMarks, reason: i.reason, requestedBy: actor });
  await audit({ actor, action: 'correction_request', module: 'results', entity: 'CorrectionRequest', entityId: r.id, after: { old: mark.obtained, new: i.newMarks } });
  return r;
}
export const reviewCorrection = (id: string, decision: 'approve' | 'reject', actor: string) => tx(async s => {
  const r = await CorrectionRequest.findOneAndUpdate({ _id: id, status: 'pending', requestedBy: { $ne: actor } }, { status: decision === 'approve' ? 'approved' : 'rejected', reviewedBy: actor }, { new: true, session: s });
  if (!r) throw new AppError(409, 'Request not pending, or you cannot review your own request', 'INVALID_TRANSITION');
  if (decision === 'approve') {
    const u = await Mark.updateOne({ exam: r.exam, student: r.student, subject: r.subject, obtained: r.oldMarks }, { $set: { obtained: r.newMarks, absent: false } }, { session: s });
    if (u.modifiedCount !== 1) throw new AppError(409, 'Mark changed since request; submit a new correction', 'STALE');
  }
  await audit({ actor, action: `correction_${decision}`, module: 'results', entity: 'CorrectionRequest', entityId: id, before: { marks: r.oldMarks }, after: { marks: decision === 'approve' ? r.newMarks : r.oldMarks } }, s);
  return r;
});
export const marksheet = async (examId: string, studentId: string) => {
  const exam = await Exam.findById(examId).populate('subjects.subject', 'name').lean(); if (!exam) throw new AppError(404, 'Exam not found');
  const marks = await Mark.find({ exam: examId, student: studentId }).lean(); const result = (await computeResults(examId)).find(r => String(r.studentId) === studentId);
  if (!result) throw new AppError(404, 'No marks for student');
  return { exam: { name: exam.name, status: exam.status }, subjects: exam.subjects.map(s => ({ name: (s.subject as unknown as { name: string }).name, maxMarks: s.maxMarks, passMarks: s.passMarks,
    obtained: marks.find(m => eq(m.subject, (s.subject as unknown as { _id: unknown })._id))?.obtained ?? null })), result };
};
