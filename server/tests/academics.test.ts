import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Student } from '../src/models/Student';
import { AcademicSession, Course, ClassLevel, Subject, Enrollment, Mark, CorrectionRequest } from '../src/models/Academics';
import * as S from '../src/services/academics.service';
let rs: MongoMemoryReplSet; const t1 = new mongoose.Types.ObjectId().toString(), t2 = new mongoose.Types.ObjectId().toString();
let sess: string, cls: string, sub1: string, sub2: string, stu: string[] = [], exam: string;
beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(rs.getUri());
  await Promise.all([Student, Enrollment, Mark, CorrectionRequest].map(m => m.syncIndexes()));
  sess = (await AcademicSession.create({ name: '2026-27' })).id; const c = await Course.create({ name: 'Alimiyat' }); cls = (await ClassLevel.create({ course: c._id, name: 'Year 1' })).id;
  sub1 = (await Subject.create({ classLevel: cls, name: 'Fiqh' })).id; sub2 = (await Subject.create({ classLevel: cls, name: 'Hadith' })).id;
  for (const n of ['P', 'Q']) stu.push((await Student.create({ admissionNumber: n, name: n, fatherName: 'F', dob: new Date('2005-01-01'), gender: 'male' })).id);
  for (const s of stu) await S.enrollStudent({ studentId: s, sessionId: sess, classId: cls }, t1);
  exam = (await S.createExam({ name: 'Annual', sessionId: sess, classId: cls, subjects: [{ subjectId: sub1, maxMarks: 100, passMarks: 40 }, { subjectId: sub2, maxMarks: 100, passMarks: 40 }] }, t1)).id;
}, 120000);
afterAll(async () => { await mongoose.disconnect(); await rs?.stop(); });
describe('academics', () => {
  it('blocks double enrollment, over-max marks, incomplete finalize', async () => {
    await expect(S.enrollStudent({ studentId: stu[0]!, sessionId: sess, classId: cls }, t1)).rejects.toThrow();
    await expect(S.enterMarks(exam, [{ studentId: stu[0]!, subjectId: sub1, obtained: 101 }], t1)).rejects.toThrow();
    await S.enterMarks(exam, [{ studentId: stu[0]!, subjectId: sub1, obtained: 90 }, { studentId: stu[0]!, subjectId: sub2, obtained: 85 }], t1);
    await expect(S.finalizeExam(exam, t1)).rejects.toThrow('incomplete');
  });
  it('computes grade/pass-fail, finalizes, locks marks, runs correction with separation of duties', async () => {
    await S.enterMarks(exam, [{ studentId: stu[1]!, subjectId: sub1, obtained: 30 }, { studentId: stu[1]!, subjectId: sub2, obtained: 90 }], t1);
    const r = await S.computeResults(exam); expect(r[0]!.grade).toBe('A'); expect(r[0]!.percentBp).toBe(8750);
    expect(r.find(x => x.name === 'Q')!.passed).toBe(false);
    await S.finalizeExam(exam, t1);
    await expect(S.enterMarks(exam, [{ studentId: stu[1]!, subjectId: sub1, obtained: 50 }], t1)).rejects.toThrow('finalized');
    const cr = await S.requestCorrection(exam, { studentId: stu[1]!, subjectId: sub1, newMarks: 45, reason: 'Totalling error' }, t1);
    await expect(S.reviewCorrection(cr.id, 'approve', t1)).rejects.toThrow(); // cannot self-approve
    await S.reviewCorrection(cr.id, 'approve', t2);
    expect((await S.computeResults(exam)).find(x => x.name === 'Q')!.passed).toBe(true);
  });
});
