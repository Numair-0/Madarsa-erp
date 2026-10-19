import { Schema, model } from 'mongoose';
export const ROLES = ['super_admin','admin','principal','accountant','librarian','hostel_incharge','mess_incharge','storekeeper','teacher'] as const;
export type Role = typeof ROLES[number];
const userSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export const User = model('User', userSchema);
