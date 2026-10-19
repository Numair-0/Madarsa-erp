import { Demand, DEMAND_STATUS } from '../models/Kitchen';
import { nextSequence } from '../models/Counter';
import { AppError } from '../utils/errors';
import { audit } from './audit.service';
import { moveStock, tx } from './inventory.service';
type Status = typeof DEMAND_STATUS[number];
export type Action = 'submit' | 'approve' | 'reject' | 'close';
const TARGET: Record<Action, Status> = { submit: 'submitted', approve: 'approved', reject: 'rejected', close: 'closed' };
export const TRANSITIONS: Record<Action, Status[]> = { submit: ['draft'], approve: ['submitted'], reject: ['submitted'], close: ['approved', 'partially_fulfilled'] };
export const createDemand = (input: { kind: 'ration' | 'equipment'; description?: string; items: { item: string; qty: number; priority?: 'low' | 'normal' | 'high' }[] }, actor: string) => tx(async s => {
  const year = new Date().getFullYear();
  const number = `D-${year}-${String(await nextSequence(`demand:${year}`, s)).padStart(4, '0')}`;
  const [d] = await Demand.create([{ ...input, number, requestedBy: actor }], { session: s });
  await audit({ actor, action: 'create', module: 'kitchen', entity: 'Demand', entityId: d!.id }, s);
  return d!;
});
/** Atomic guarded transition: invalid source status => 409. */
export async function transition(id: string, action: Action, actor: string, note?: string) {
  const to = TARGET[action];
  const d = await Demand.findOneAndUpdate({ _id: id, status: { $in: TRANSITIONS[action] } }, { status: to, ...(action === 'approve' || action === 'reject' ? { reviewedBy: actor, reviewNote: note } : {}) }, { new: true });
  if (!d) throw new AppError(409, `Cannot ${action} this demand in its current status`, 'INVALID_TRANSITION');
  await audit({ actor, action, module: 'kitchen', entity: 'Demand', entityId: d.id, after: { status: to } });
  return d;
}
/** Partial fulfilment: each line issues stock OUT; status becomes partially_fulfilled/fulfilled. All-or-nothing per call. */
export const fulfill = (id: string, lines: { itemId: string; qty: number }[], actor: string) => tx(async s => {
  if (new Set(lines.map(l => l.itemId)).size !== lines.length) throw new AppError(400, 'Duplicate item in fulfilment', 'BAD_LINES');
  const d = await Demand.findOne({ _id: id, status: { $in: ['approved', 'partially_fulfilled'] } }).session(s);
  if (!d) throw new AppError(409, 'Demand is not approved for fulfilment', 'INVALID_TRANSITION');
  for (const l of lines) {
    const line = d.items.find(i => String(i.item) === l.itemId);
    if (!line) throw new AppError(422, 'Item is not part of this demand', 'BAD_LINES');
    if (line.fulfilledQty + l.qty > line.qty) throw new AppError(422, 'Exceeds demanded quantity', 'BAD_LINES');
    await moveStock(l.itemId, -l.qty, 'out', actor, s, { ref: { kind: 'demand', id: d.number } });
    line.fulfilledQty += l.qty;
  }
  d.status = d.items.every(i => i.fulfilledQty >= i.qty) ? 'fulfilled' : 'partially_fulfilled';
  await d.save({ session: s });
  await audit({ actor, action: 'fulfill', module: 'kitchen', entity: 'Demand', entityId: d.id, after: { status: d.status } }, s);
  return d;
});
