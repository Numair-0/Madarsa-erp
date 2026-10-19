import { Router, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { asyncHandler, authenticate, requirePermission } from '../middleware/auth';
import { Item, StockMovement } from '../models/Inventory';
import { Demand, DailyMenu } from '../models/Kitchen';
import { Donor, Donation } from '../models/Donation';
import { lowStock, recordMovement } from '../services/inventory.service';
import { createDemand, fulfill, transition } from '../services/kitchen.service';
import { recordDonation } from '../services/donation.service';
const oid = z.string().refine(mongoose.isValidObjectId, 'Invalid id');
const qty = z.number().int();
const pg = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
export const ops = Router();
ops.use(authenticate);
// Inventory
ops.post('/inventory/items', requirePermission('inventory:manage'), asyncHandler(async (req, res) =>
  ok(res, await Item.create(z.object({ name: z.string().min(1), unit: z.string().min(1), category: z.string().optional(), lowStockThreshold: z.number().int().min(0).default(0) }).strict().parse(req.body)), 201))); // stockQty only changes via movements
ops.get('/inventory/items', requirePermission('inventory:view'), asyncHandler(async (req, res) => { const q = pg.parse(req.query);
  ok(res, { items: await Item.find().sort({ name: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), total: await Item.countDocuments() }); }));
ops.get('/inventory/low-stock', requirePermission('inventory:view'), asyncHandler(async (_req, res) => ok(res, await lowStock())));
ops.post('/inventory/movements', requirePermission('inventory:create'), asyncHandler(async (req, res) => {
  const b = z.object({ itemId: oid, type: z.enum(['in', 'out', 'adjust']), qty, reason: z.string().optional() }).strict().parse(req.body);
  ok(res, await recordMovement(b.itemId, b.type, b.qty, req.user!.id, b.reason), 201); }));
ops.get('/inventory/items/:id/ledger', requirePermission('inventory:view'), asyncHandler(async (req, res) =>
  ok(res, await StockMovement.find({ item: oid.parse(req.params.id) }).sort({ createdAt: -1 }).limit(200).lean())));
// Kitchen
ops.post('/kitchen/demands', requirePermission('kitchen:create'), asyncHandler(async (req, res) => {
  const b = z.object({ kind: z.enum(['ration', 'equipment']), description: z.string().optional(),
    items: z.array(z.object({ item: oid, qty: z.number().int().positive(), priority: z.enum(['low', 'normal', 'high']).optional() }).strict()).min(1) }).strict().parse(req.body);
  ok(res, await createDemand(b, req.user!.id), 201); }));
ops.get('/kitchen/demands', requirePermission('kitchen:view'), asyncHandler(async (req, res) => { const q = pg.extend({ status: z.string().optional() }).parse(req.query);
  const f = q.status ? { status: q.status } : {}; ok(res, { items: await Demand.find(f).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), total: await Demand.countDocuments(f) }); }));
ops.post('/kitchen/demands/:id/submit', requirePermission('kitchen:create'), asyncHandler(async (req, res) => ok(res, await transition(oid.parse(req.params.id), 'submit', req.user!.id))));
ops.post('/kitchen/demands/:id/review', requirePermission('kitchen:approve'), asyncHandler(async (req, res) => {
  const b = z.object({ decision: z.enum(['approve', 'reject']), note: z.string().optional() }).strict().parse(req.body);
  ok(res, await transition(oid.parse(req.params.id), b.decision, req.user!.id, b.note)); }));
ops.post('/kitchen/demands/:id/close', requirePermission('kitchen:approve'), asyncHandler(async (req, res) => ok(res, await transition(oid.parse(req.params.id), 'close', req.user!.id))));
ops.post('/kitchen/demands/:id/fulfill', requirePermission('kitchen:fulfill'), asyncHandler(async (req, res) => {
  const b = z.object({ lines: z.array(z.object({ itemId: oid, qty: z.number().int().positive() }).strict()).min(1) }).strict().parse(req.body);
  ok(res, await fulfill(oid.parse(req.params.id), b.lines, req.user!.id)); }));
ops.put('/kitchen/menu', requirePermission('kitchen:create'), asyncHandler(async (req, res) => {
  const b = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), breakfast: z.string().optional(), lunch: z.string().optional(), dinner: z.string().optional() }).strict().parse(req.body);
  ok(res, await DailyMenu.findOneAndUpdate({ date: b.date }, b, { upsert: true, new: true })); }));
// Donations
ops.post('/donations/donors', requirePermission('donations:create'), asyncHandler(async (req, res) =>
  ok(res, await Donor.create(z.object({ name: z.string().min(2), phone: z.string().optional(), address: z.string().optional() }).strict().parse(req.body)), 201)));
ops.post('/donations', requirePermission('donations:create'), asyncHandler(async (req, res) => {
  const b = z.object({ donorId: oid, category: z.string().min(2), amountPaise: z.number().int().positive(), mode: z.enum(['cash', 'upi', 'bank', 'cheque', 'other']), purpose: z.string().optional(), notes: z.string().optional() }).strict().parse(req.body);
  ok(res, await recordDonation(b, req.user!.id), 201); }));
ops.get('/donations', requirePermission('donations:view'), asyncHandler(async (req, res) => { const q = pg.parse(req.query);
  ok(res, { items: await Donation.find().sort({ date: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), total: await Donation.countDocuments() }); }));
