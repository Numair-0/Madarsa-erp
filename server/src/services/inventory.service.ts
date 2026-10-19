import mongoose, { ClientSession } from 'mongoose';
import { Item, StockMovement } from '../models/Inventory';
import { AppError } from '../utils/errors';
import { audit } from './audit.service';
export async function tx<T>(fn: (s: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try { let r!: T; await session.withTransaction(async () => { r = await fn(session); }); return r; } finally { await session.endSession(); }
}
/** Every stock change goes through here: guarded atomic update + ledger row. Never negative. */
export async function moveStock(itemId: string, delta: number, type: 'in' | 'out' | 'adjust', actor: string, s: ClientSession, opts: { reason?: string; ref?: { kind: string; id: string } } = {}) {
  if (!Number.isInteger(delta) || delta === 0) throw new AppError(400, 'Quantity must be a non-zero integer', 'BAD_QTY');
  if ((type === 'in' && delta < 0) || (type === 'out' && delta > 0)) throw new AppError(400, `Wrong sign for ${type}`, 'BAD_QTY');
  const item = await Item.findOneAndUpdate({ _id: itemId, ...(delta < 0 ? { stockQty: { $gte: -delta } } : {}) }, { $inc: { stockQty: delta } }, { new: true, session: s });
  if (!item) {
    if (!(await Item.exists({ _id: itemId }).session(s))) throw new AppError(404, 'Item not found');
    throw new AppError(422, 'Insufficient stock', 'INSUFFICIENT_STOCK');
  }
  const [m] = await StockMovement.create([{ item: item._id, type, delta, balanceAfter: item.stockQty, by: actor, ...opts }], { session: s });
  await audit({ actor, action: type, module: 'inventory', entity: 'StockMovement', entityId: m!.id, after: { delta, balanceAfter: item.stockQty } }, s);
  return m!;
}
export const recordMovement = (itemId: string, type: 'in' | 'out' | 'adjust', qty: number, actor: string, reason?: string) =>
  tx(s => moveStock(itemId, type === 'out' ? -Math.abs(qty) : type === 'in' ? Math.abs(qty) : qty, type, actor, s, reason ? { reason } : {}));
export const lowStock = () => Item.find({ $expr: { $lte: ['$stockQty', '$lowStockThreshold'] } }).sort({ name: 1 }).lean();
