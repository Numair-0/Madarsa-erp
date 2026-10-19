import { Schema, model } from 'mongoose';
export const STUDENT_STATUS = ['active','inactive','transferred','left','graduated'] as const;
const s = new Schema({
  admissionNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  fatherName: { type: String, required: true, trim: true },
  motherName: String,
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['male','female'], required: true },
  contact: String, address: String,
  guardian: { name: String, phone: String, relation: String },
  admissionDate: { type: Date, default: Date.now },
  status: { type: String, enum: STUDENT_STATUS, default: 'active' },
}, { timestamps: true });
s.index({ name: 1, fatherName: 1, dob: 1 });
s.index({ status: 1, createdAt: -1 });
export const Student = model('Student', s);
