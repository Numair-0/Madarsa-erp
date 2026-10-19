import { ClientSession } from 'mongoose';
import { AuditLog } from '../models/AuditLog';
export const audit = (e: { actor?: string; action: string; module: string; entity?: string; entityId?: string; before?: unknown; after?: unknown; meta?: unknown }, session?: ClientSession) =>
  AuditLog.create([e], { session });
