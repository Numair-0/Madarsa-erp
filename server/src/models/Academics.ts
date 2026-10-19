import { Schema, model } from 'mongoose';
const ref = (n: string, required = true) => ({ type: Schema.Types.ObjectId, ref: n, required });
const int = { type: Number, validate: Number.isInteger, min: 0 };
export const AcademicSession = model('AcademicSession', new Schema({ name: { type: String, required: true, unique: true }, startDate: Date, endDate: Date, active: { type: Boolean, default: false } }, { timestamps: true }));
export const Course = model('Course', new Schema({ name: { type: String, required: true, unique: true } }, { timestamps: true }));
const cls = new Schema({ course: ref('Course'), name: { type: String, required: true } }, { timestamps: true }); cls.index({ course: 1, name: 1 }, { unique: true });
export const ClassLevel = model('ClassLevel', cls);
const sec = new Schema({ classLevel: ref('ClassLevel'), name: { type: String, required: true } }, { timestamps: true }); sec.index({ classLevel: 1, name: 1 }, { unique: true });
export const Section = model('Section', sec);
const sub = new Schema({ classLevel: ref('ClassLevel'), name: { type: String, required: true } }, { timestamps: true }); sub.index({ classLevel: 1, name: 1 }, { unique: true });
export const Subject = model('Subject', sub);
const enr = new Schema({ student: ref('Student'), session: ref('AcademicSession'), classLevel: ref('ClassLevel'), section: ref('Section', false), status: { type: String, enum: ['active', 'ended'], default: 'active' } }, { timestamps: true });
enr.index({ student: 1, session: 1 }, { unique: true, partialFilterExpression: { status: 'active' } }); enr.index({ session: 1, classLevel: 1, status: 1 });
export const Enrollment = model('Enrollment', enr);
export const DEFAULT_BANDS = [{ minPercent: 90, grade: 'A+' }, { minPercent: 80, grade: 'A' }, { minPercent: 70, grade: 'B' }, { minPercent: 60, grade: 'C' }, { minPercent: 40, grade: 'D' }, { minPercent: 0, grade: 'F' }];
export const GradeRule = model('GradeRule', new Schema({ key: { type: String, default: 'main', unique: true }, bands: [{ _id: false, minPercent: { type: Number, min: 0, max: 100 }, grade: String }] }));
const exam = new Schema({ name: { type: String, required: true }, session: ref('AcademicSession'), classLevel: ref('ClassLevel'),
  subjects: { type: [{ _id: false, subject: ref('Subject'), maxMarks: { ...int, required: true, min: 1 }, passMarks: { ...int, required: true } }], validate: (v: unknown[]) => v.length > 0 },
  status: { type: String, enum: ['draft', 'finalized'], default: 'draft' }, finalizedAt: Date, finalizedBy: ref('User', false) }, { timestamps: true });
exam.index({ session: 1, classLevel: 1 });
export const Exam = model('Exam', exam);
const mark = new Schema({ exam: ref('Exam'), student: ref('Student'), subject: ref('Subject'), obtained: { ...int, default: 0 }, absent: { type: Boolean, default: false }, enteredBy: ref('User', false) }, { timestamps: true });
mark.index({ exam: 1, student: 1, subject: 1 }, { unique: true });
export const Mark = model('Mark', mark);
const cr = new Schema({ exam: ref('Exam'), student: ref('Student'), subject: ref('Subject'), oldMarks: int, newMarks: { ...int, required: true }, reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, requestedBy: ref('User'), reviewedBy: ref('User', false) }, { timestamps: true });
cr.index({ exam: 1, status: 1 });
export const CorrectionRequest = model('CorrectionRequest', cr);
