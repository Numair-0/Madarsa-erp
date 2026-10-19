import { Router, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { asyncHandler, authenticate, requirePermission } from '../middleware/auth';
import { User, ROLES } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { ACTIONS, RESOURCES } from '../config/permissions';
import * as A from '../services/admin.service';
const oid = z.string().refine(mongoose.isValidObjectId, 'Invalid id');
const role = z.enum(ROLES);
const password = z.string().min(8).max(128).regex(/[A-Za-z]/, 'Needs a letter').regex(/\d/, 'Needs a digit');
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
const str = (n: number) => z.string().trim().max(n).optional();
export const admin = Router();
admin.use(authenticate);
admin.get('/settings', asyncHandler(async (_req, res) => ok(res, await A.getSettings())));
admin.put('/settings', requirePermission('settings:manage'), asyncHandler(async (req, res) => {
  const b = z.object({ name: z.string().trim().min(2).max(120), address: str(300), phone: str(40), email: z.string().email().optional().or(z.literal('')), logoUrl: str(500),
    academicSession: str(30), dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(), currency: z.literal('INR').optional(), language: z.enum(['en', 'ur', 'hi', 'ar']).optional(),
    receiptFooter: str(300), reportHeader: str(300), reportFooter: str(300) }).strict().parse(req.body);
  ok(res, await A.updateSettings(b, req.user!.id)); }));
admin.get('/users', requirePermission('users:view'), asyncHandler(async (_req, res) => ok(res, await User.find().sort({ username: 1 }).lean())));
admin.post('/users', requirePermission('users:manage'), asyncHandler(async (req, res) => {
  const b = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/), name: z.string().trim().min(2), password, role }).strict().parse(req.body);
  ok(res, await A.createUser(b, req.user!), 201); }));
admin.patch('/users/:id', requirePermission('users:manage'), asyncHandler(async (req, res) => {
  const b = z.object({ name: z.string().trim().min(2).optional(), role: role.optional(), active: z.boolean().optional() }).strict().parse(req.body);
  ok(res, await A.updateUser(oid.parse(req.params.id), b, req.user!)); }));
admin.post('/users/:id/reset-password', requirePermission('users:manage'), asyncHandler(async (req, res) => {
  await A.resetPassword(oid.parse(req.params.id), z.object({ password }).strict().parse(req.body).password, req.user!); ok(res, { reset: true }); }));
admin.get('/roles', requirePermission('roles:view'), asyncHandler(async (_req, res) => ok(res, { roles: A.listRoles(), catalog: { resources: RESOURCES, actions: ACTIONS } })));
admin.put('/roles/:role/permissions', requirePermission('roles:manage'), asyncHandler(async (req, res) => {
  ok(res, await A.setPermissions(role.parse(req.params.role), z.object({ permissions: z.array(z.string()).max(200) }).strict().parse(req.body).permissions, req.user!.id)); }));
admin.get('/audit-logs', requirePermission('audit:view'), asyncHandler(async (req, res) => {
  const q = z.object({ module: z.string().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
  const f = q.module ? { module: q.module } : {};
  ok(res, { items: await AuditLog.find(f).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('actor', 'username').lean(), total: await AuditLog.countDocuments(f) }); }));
