import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env';
import { asyncHandler, authenticate, requirePermission } from '../middleware/auth';
import { login } from '../services/auth.service';
import { admitStudent, searchStudents } from '../services/student.service';
import { STUDENT_STATUS } from '../models/Student';
import { fees } from './fees';
export const api = Router();
api.use(fees);
import { hostelLibrary } from './hostelLibrary';
api.use(hostelLibrary);
import { ops } from './ops';
api.use(ops);
import { reports } from './reports';
api.use(reports);
import { admin } from './admin';
api.use(admin);
import { academics } from './academics';
api.use(academics);
const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, secure: env.NODE_ENV === 'production', maxAge: 8 * 3600_000, path: '/' };
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: env.NODE_ENV === 'test' ? 1000 : 10, standardHeaders: true });
api.post('/auth/login', loginLimiter, asyncHandler(async (req, res) => {
  const b = z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(req.body);
  const { token, user } = await login(b.username, b.password);
  res.cookie('token', token, cookieOpts).json({ success: true, data: user });
}));
api.post('/auth/logout', (_req, res) => { res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', path: '/' }).json({ success: true }); });
api.get('/auth/me', authenticate, (req, res) => { res.json({ success: true, data: req.user }); });
const admission = z.object({
  name: z.string().min(2).trim(), fatherName: z.string().min(2).trim(), motherName: z.string().optional(),
  dob: z.coerce.date(), gender: z.enum(['male', 'female']), contact: z.string().optional(), address: z.string().optional(),
  guardian: z.object({ name: z.string().optional(), phone: z.string().optional(), relation: z.string().optional() }).optional(),
}).strict(); // strict => blocks mass assignment (admissionNumber, status)
api.post('/students', authenticate, requirePermission('students:create'), asyncHandler(async (req, res) => {
  const s = await admitStudent(admission.parse(req.body), req.user!.id);
  res.status(201).json({ success: true, data: s });
}));
api.get('/students', authenticate, requirePermission('students:view'), asyncHandler(async (req, res) => {
  const q = z.object({ search: z.string().optional(), status: z.enum(STUDENT_STATUS).optional(),
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(req.query);
  res.json({ success: true, data: await searchStudents(q) });
}));
