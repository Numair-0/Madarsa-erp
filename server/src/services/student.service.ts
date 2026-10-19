import mongoose from 'mongoose';
import { Student } from '../models/Student';
import { nextSequence } from '../models/Counter';
import { AppError } from '../utils/errors';
import { audit } from './audit.service';
export interface AdmissionInput { name: string; fatherName: string; motherName?: string | undefined; dob: Date; gender: 'male'|'female'; contact?: string | undefined; address?: string | undefined; guardian?: { name?: string | undefined; phone?: string | undefined; relation?: string | undefined } | undefined }
export async function admitStudent(input: AdmissionInput, actor: string) {
  const dup = await Student.findOne({ name: input.name, fatherName: input.fatherName, dob: input.dob });
  if (dup) throw new AppError(409, `Possible duplicate: ${dup.admissionNumber}`, 'DUPLICATE_STUDENT');
  const session = await mongoose.startSession();
  try {
    let result: InstanceType<typeof Student> | undefined;
    await session.withTransaction(async () => {
      const year = new Date().getFullYear();
      const seq = await nextSequence(`admission:${year}`, session);
      const admissionNumber = `ADM-${year}-${String(seq).padStart(4, '0')}`;
      const [s] = await Student.create([{ ...input, admissionNumber }], { session });
      await audit({ actor, action: 'create', module: 'students', entity: 'Student', entityId: s!.id, after: { admissionNumber } }, session);
      result = s;
    });
    return result!;
  } finally { await session.endSession(); }
}
export async function searchStudents(q: { search?: string | undefined; status?: string | undefined; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.search) { const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); filter.$or = [{ name: rx }, { fatherName: rx }, { admissionNumber: rx }]; }
  const [items, total] = await Promise.all([
    Student.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Student.countDocuments(filter)]);
  return { items, total, page: q.page, limit: q.limit };
}
