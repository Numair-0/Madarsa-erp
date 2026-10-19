import { Router, Response } from 'express';
import { z } from 'zod';
import mongoose, { Model } from 'mongoose';
import { asyncHandler, authenticate, requirePermission } from '../middleware/auth';
import { AcademicSession, Course, ClassLevel, Section, Subject, Enrollment, Exam, GradeRule, DEFAULT_BANDS } from '../models/Academics';
import * as S from '../services/academics.service';
import { audit } from '../services/audit.service';
const oid = z.string().refine(mongoose.isValidObjectId, 'Invalid id');
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
export const academics = Router(); academics.use(authenticate);
// Generic create/list for the structure hierarchy
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const crud = (path: string, M: Model<any>, body: z.ZodTypeAny, parent?: string) => {
  academics.post(`/academics/${path}`, requirePermission('academics:manage'), asyncHandler(async (req, res) => {
    const d = await M.create(body.parse(req.body)); await audit({ actor: req.user!.id, action: 'create', module: 'academics', entity: path, entityId: d.id }); ok(res, d, 201); }));
  academics.get(`/academics/${path}`, requirePermission('academics:view'), asyncHandler(async (req, res) => {
    const f = parent && req.query[parent] ? { [parent]: oid.parse(req.query[parent]) } : {}; ok(res, await M.find(f).sort({ name: 1 }).lean()); }));
};
crud('sessions', AcademicSession, z.object({ name: z.string().min(2), startDate: z.coerce.date().optional(), endDate: z.coerce.date().optional(), active: z.boolean().optional() }).strict());
crud('courses', Course, z.object({ name: z.string().min(2) }).strict());
crud('classes', ClassLevel, z.object({ course: oid, name: z.string().min(1) }).strict(), 'course');
crud('sections', Section, z.object({ classLevel: oid, name: z.string().min(1) }).strict(), 'classLevel');
crud('subjects', Subject, z.object({ classLevel: oid, name: z.string().min(1) }).strict(), 'classLevel');
academics.post('/enrollments', requirePermission('students:edit'), asyncHandler(async (req, res) => {
  const b = z.object({ studentId: oid, sessionId: oid, classId: oid, sectionId: oid.optional() }).strict().parse(req.body); ok(res, await S.enrollStudent(b, req.user!.id), 201); }));
academics.get('/enrollments', requirePermission('students:view'), asyncHandler(async (req, res) => {
  const q = z.object({ sessionId: oid.optional(), classId: oid.optional() }).parse(req.query);
  ok(res, await Enrollment.find({ status: 'active', ...(q.sessionId ? { session: q.sessionId } : {}), ...(q.classId ? { classLevel: q.classId } : {}) }).populate('student', 'name admissionNumber').limit(500).lean()); }));
academics.get('/exams/grade-rules', requirePermission('results:view'), asyncHandler(async (_req, res) => ok(res, (await GradeRule.findOne({ key: 'main' }).lean())?.bands ?? DEFAULT_BANDS)));
academics.put('/exams/grade-rules', requirePermission('academics:manage'), asyncHandler(async (req, res) => {
  const bands = z.object({ bands: z.array(z.object({ minPercent: z.number().min(0).max(100), grade: z.string().min(1) }).strict()).min(2).refine(b => b.some(x => x.minPercent === 0), 'Need a band starting at 0') }).strict().parse(req.body).bands;
  await GradeRule.updateOne({ key: 'main' }, { bands }, { upsert: true }); await audit({ actor: req.user!.id, action: 'update', module: 'academics', entity: 'GradeRule', after: bands }); ok(res, bands); }));
academics.post('/exams', requirePermission('academics:manage'), asyncHandler(async (req, res) => {
  const b = z.object({ name: z.string().min(2), sessionId: oid, classId: oid, subjects: z.array(z.object({ subjectId: oid, maxMarks: z.number().int().positive(), passMarks: z.number().int().min(0) }).strict()).min(1) }).strict().parse(req.body);
  ok(res, await S.createExam(b, req.user!.id), 201); }));
academics.get('/exams', requirePermission('results:view'), asyncHandler(async (_req, res) => ok(res, await Exam.find().sort({ createdAt: -1 }).limit(100).lean())));
academics.post('/exams/:id/marks', requirePermission('results:create'), asyncHandler(async (req, res) => {
  const b = z.object({ entries: z.array(z.object({ studentId: oid, subjectId: oid, obtained: z.number().int().min(0).optional(), absent: z.boolean().optional() }).strict()).min(1).max(1000) }).strict().parse(req.body);
  ok(res, await S.enterMarks(oid.parse(req.params.id), b.entries, req.user!.id)); }));
academics.get('/exams/:id/results', requirePermission('results:view'), asyncHandler(async (req, res) => ok(res, await S.computeResults(oid.parse(req.params.id)))));
academics.get('/exams/:id/marksheet/:studentId', requirePermission('results:view'), asyncHandler(async (req, res) => ok(res, await S.marksheet(oid.parse(req.params.id), oid.parse(req.params.studentId)))));
academics.post('/exams/:id/finalize', requirePermission('results:finalize'), asyncHandler(async (req, res) => ok(res, await S.finalizeExam(oid.parse(req.params.id), req.user!.id))));
academics.post('/exams/:id/corrections', requirePermission('results:create'), asyncHandler(async (req, res) => {
  const b = z.object({ studentId: oid, subjectId: oid, newMarks: z.number().int().min(0), reason: z.string().min(5) }).strict().parse(req.body); ok(res, await S.requestCorrection(oid.parse(req.params.id), b, req.user!.id), 201); }));
academics.post('/corrections/:id/review', requirePermission('results:approve'), asyncHandler(async (req, res) => {
  ok(res, await S.reviewCorrection(oid.parse(req.params.id), z.object({ decision: z.enum(['approve', 'reject']) }).strict().parse(req.body).decision, req.user!.id)); }));
