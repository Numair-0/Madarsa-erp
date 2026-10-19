import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { asyncHandler, authenticate, requirePermission } from '../middleware/auth';
import { Hostel, Room, Bed } from '../models/Hostel';
import { BookTitle, BookCopy } from '../models/Library';
import { allocateBed, occupancy, releaseStudent, transferStudent } from '../services/hostel.service';
import { issueBook, overdueIssues, returnBook } from '../services/library.service';
const oid = z.string().refine(mongoose.isValidObjectId, 'Invalid id');
const ok = (res: import('express').Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
export const hostelLibrary = Router();
hostelLibrary.use(authenticate);
const H = (p: string) => `/hostel${p}`;
hostelLibrary.post(H('/hostels'), requirePermission('hostel:manage'), asyncHandler(async (req, res) => ok(res, await Hostel.create(z.object({ name: z.string().min(2) }).strict().parse(req.body)), 201)));
hostelLibrary.post(H('/rooms'), requirePermission('hostel:manage'), asyncHandler(async (req, res) =>
  ok(res, await Room.create(z.object({ hostel: oid, floor: z.string().optional(), number: z.string().min(1) }).strict().parse(req.body)), 201)));
hostelLibrary.post(H('/beds'), requirePermission('hostel:manage'), asyncHandler(async (req, res) =>
  ok(res, await Bed.create(z.object({ room: oid, label: z.string().min(1) }).strict().parse(req.body)), 201)));
hostelLibrary.post(H('/allocations'), requirePermission('hostel:manage'), asyncHandler(async (req, res) => {
  const b = z.object({ studentId: oid, bedId: oid }).strict().parse(req.body); ok(res, await allocateBed(b.studentId, b.bedId, req.user!.id), 201);
}));
hostelLibrary.post(H('/transfers'), requirePermission('hostel:manage'), asyncHandler(async (req, res) => {
  const b = z.object({ studentId: oid, newBedId: oid }).strict().parse(req.body); ok(res, await transferStudent(b.studentId, b.newBedId, req.user!.id));
}));
hostelLibrary.post(H('/releases'), requirePermission('hostel:manage'), asyncHandler(async (req, res) => {
  const b = z.object({ studentId: oid, reason: z.string().min(2) }).strict().parse(req.body); ok(res, await releaseStudent(b.studentId, b.reason, req.user!.id));
}));
hostelLibrary.get(H('/occupancy'), requirePermission('hostel:view'), asyncHandler(async (_req, res) => ok(res, await occupancy())));
const L = (p: string) => `/library${p}`;
hostelLibrary.post(L('/titles'), requirePermission('library:manage'), asyncHandler(async (req, res) =>
  ok(res, await BookTitle.create(z.object({ title: z.string().min(1), author: z.string().optional(), publisher: z.string().optional(), category: z.string().optional() }).strict().parse(req.body)), 201)));
hostelLibrary.post(L('/copies'), requirePermission('library:manage'), asyncHandler(async (req, res) =>
  ok(res, await BookCopy.create(z.object({ title: oid, accessionNumber: z.string().min(1) }).strict().parse(req.body)), 201)));
hostelLibrary.post(L('/issues'), requirePermission('library:issue'), asyncHandler(async (req, res) => {
  const b = z.object({ accessionNumber: z.string().min(1), studentId: oid }).strict().parse(req.body); ok(res, await issueBook(b.accessionNumber, b.studentId, req.user!.id), 201);
}));
hostelLibrary.post(L('/returns'), requirePermission('library:return'), asyncHandler(async (req, res) => {
  const b = z.object({ accessionNumber: z.string().min(1), condition: z.enum(['good', 'damaged', 'lost']).default('good') }).strict().parse(req.body);
  ok(res, await returnBook(b.accessionNumber, b.condition, req.user!.id));
}));
hostelLibrary.get(L('/overdue'), requirePermission('library:view'), asyncHandler(async (_req, res) => ok(res, await overdueIssues())));
