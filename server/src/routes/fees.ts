import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { asyncHandler, authenticate, requirePermission } from '../middleware/auth';
import { FeeStructure, FREQUENCIES, Payment } from '../models/Fees';
import { collectPayment, generateDues, getPayment, outstandingDues, reversePayment } from '../services/fees.service';
import { audit } from '../services/audit.service';
const oid = z.string().refine(mongoose.isValidObjectId, 'Invalid id');
export const fees = Router();
fees.use(authenticate);
fees.post('/fees/structures', requirePermission('fees:manage'), asyncHandler(async (req, res) => {
  const b = z.object({ name: z.string().min(2), amountPaise: z.number().int().positive(), frequency: z.enum(FREQUENCIES) }).strict().parse(req.body);
  const s = await FeeStructure.create(b);
  await audit({ actor: req.user!.id, action: 'create', module: 'fees', entity: 'FeeStructure', entityId: s.id });
  res.status(201).json({ success: true, data: s });
}));
fees.post('/fees/dues/generate', requirePermission('fees:manage'), asyncHandler(async (req, res) => {
  const b = z.object({ structureId: oid, period: z.string().regex(/^\d{4}(-\d{2})?$/), studentIds: z.array(oid).optional() }).strict().parse(req.body);
  res.json({ success: true, data: await generateDues(b.structureId, b.period, b.studentIds) });
}));
fees.get('/fees/students/:id/dues', requirePermission('fees:view'), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await outstandingDues(oid.parse(req.params.id)) });
}));
fees.post('/payments', requirePermission('fees:collect'), asyncHandler(async (req, res) => {
  const b = z.object({ studentId: oid, mode: z.enum(['cash', 'upi', 'bank', 'cheque', 'other']),
    allocations: z.array(z.object({ obligationId: oid, amountPaise: z.number().int().positive() }).strict()).min(1) }).strict().parse(req.body);
  res.status(201).json({ success: true, data: await collectPayment(b, req.user!.id) });
}));
fees.post('/payments/:id/reverse', requirePermission('fees:manage'), asyncHandler(async (req, res) => {
  const { reason } = z.object({ reason: z.string().min(3) }).strict().parse(req.body);
  res.json({ success: true, data: await reversePayment(oid.parse(req.params.id), reason, req.user!.id) });
}));
fees.get('/payments', requirePermission('fees:view'), asyncHandler(async (req, res) => {
  const q = z.object({ student: oid.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(req.query);
  const f = q.student ? { student: q.student } : {};
  const [items, total] = await Promise.all([Payment.find(f).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Payment.countDocuments(f)]);
  res.json({ success: true, data: { items, total } });
}));
fees.get('/payments/:id', requirePermission('fees:view'), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getPayment(oid.parse(req.params.id)) });
}));
