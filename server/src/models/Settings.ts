import { Schema, model } from 'mongoose';
const s = new Schema({ key: { type: String, default: 'main', unique: true },
  name: { type: String, default: 'Madarsa' }, address: String, phone: String, email: String, logoUrl: String,
  academicSession: { type: String, default: '' }, dateFormat: { type: String, default: 'DD/MM/YYYY' }, currency: { type: String, default: 'INR' }, language: { type: String, default: 'en' },
  receiptFooter: String, reportHeader: String, reportFooter: String }, { timestamps: true });
export const Settings = model('Settings', s);
export const RolePermission = model('RolePermission', new Schema({ role: { type: String, required: true, unique: true }, permissions: [String] }, { timestamps: true }));
