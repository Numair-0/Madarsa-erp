import type { Model } from 'mongoose';
import { Student } from '../models/Student';
import { Payment, FeeObligation } from '../models/Fees';
import { Allocation, Bed } from '../models/Hostel';
import { Issue, BookCopy } from '../models/Library';
import { Item } from '../models/Inventory';
import { Demand } from '../models/Kitchen';
import { Donation } from '../models/Donation';
import { can } from '../config/permissions';
import type { Role } from '../models/User';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sum = async (m: Model<any>, match: Record<string, unknown>, field: string) =>
  (await m.aggregate<{ t: number }>([{ $match: match }, { $group: { _id: null, t: { $sum: field } } }]))[0]?.t ?? 0;
/** All numbers come from live queries; sections are included only if the role may view them. */
export async function dashboard(role: Role, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1), dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: Record<string, unknown> = {};
  const jobs: Promise<void>[] = [];
  const add = (perm: `${string}:${string}`, key: string, fn: () => Promise<unknown>) => { if (can(role, perm)) jobs.push(fn().then(v => { out[key] = v; })); };
  add('students:view', 'students', async () => { const [total, active, newThisMonth] = await Promise.all([Student.countDocuments(), Student.countDocuments({ status: 'active' }), Student.countDocuments({ createdAt: { $gte: monthStart } })]); return { total, active, newThisMonth }; });
  add('fees:view', 'fees', async () => { const [today, month, billed, paid] = await Promise.all([
    sum(Payment, { status: 'completed', createdAt: { $gte: dayStart } }, '$totalPaise'), sum(Payment, { status: 'completed', createdAt: { $gte: monthStart } }, '$totalPaise'),
    sum(FeeObligation, {}, '$amountPaise'), sum(FeeObligation, {}, '$paidPaise')]);
    return { collectedTodayPaise: today, collectedThisMonthPaise: month, outstandingPaise: billed - paid }; });
  add('hostel:view', 'hostel', async () => { const [beds, occupied] = await Promise.all([Bed.countDocuments(), Allocation.countDocuments({ status: 'active' })]); return { totalBeds: beds, occupied, vacant: beds - occupied }; });
  add('library:view', 'library', async () => { const [copies, issued, overdue] = await Promise.all([BookCopy.countDocuments(), Issue.countDocuments({ status: 'issued' }), Issue.countDocuments({ status: 'issued', dueDate: { $lt: now } })]); return { copies, issued, overdue }; });
  add('inventory:view', 'inventory', async () => ({ lowStockItems: await Item.countDocuments({ $expr: { $lte: ['$stockQty', '$lowStockThreshold'] } }) }));
  add('kitchen:view', 'kitchen', async () => ({ pendingDemands: await Demand.countDocuments({ status: 'submitted' }) }));
  add('donations:view', 'donations', async () => ({ thisMonthPaise: await sum(Donation, { date: { $gte: monthStart } }, '$amountPaise') }));
  await Promise.all(jobs);
  return out;
}
