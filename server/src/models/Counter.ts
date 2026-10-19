import { Schema, model, ClientSession } from 'mongoose';
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = model('Counter', counterSchema);
/** Atomic sequence via findOneAndUpdate + $inc (never count()+1). */
export async function nextSequence(key: string, session?: ClientSession): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true, session });
  return doc!.seq;
}
