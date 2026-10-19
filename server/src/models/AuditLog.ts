import { Schema, model } from 'mongoose';
const s = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User' }, action: { type: String, required: true },
  module: { type: String, required: true }, entity: String, entityId: String,
  before: Schema.Types.Mixed, after: Schema.Types.Mixed, meta: Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false } });
s.index({ module: 1, createdAt: -1 });
export const AuditLog = model('AuditLog', s);
