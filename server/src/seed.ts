import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from './config/env';
import { User } from './models/User';
import { ensureDefaultAccounts } from './models/Account';
import { Settings } from './models/Settings';
import { Student } from './models/Student';
import { nextSequence } from './models/Counter';
import { AcademicSession, Course, ClassLevel, Subject } from './models/Academics';
import { FeeStructure } from './models/Fees';
import { Hostel, Room, Bed } from './models/Hostel';
import { Item } from './models/Inventory';
import { BookTitle, BookCopy } from './models/Library';
import { Donor } from './models/Donation';
import { generateDues } from './services/fees.service';
(async () => {
  await mongoose.connect(env.MONGODB_URI);
  const users = [['admin','Nazim Admin','admin'],['principal','Principal','principal'],['accountant','Accountant','accountant'],['librarian','Librarian','librarian'],['hostel','Hostel Incharge','hostel_incharge'],['mess','Mess Incharge','mess_incharge'],['store','Storekeeper','storekeeper'],['teacher','Teacher','teacher']] as const;
  for (const [username, name, role] of users)
    await User.updateOne({ username }, { $setOnInsert: { name, role, passwordHash: await bcrypt.hash('Demo@12345', 10) } }, { upsert: true });
  await ensureDefaultAccounts();
  await Settings.updateOne({ key: 'main' }, { $setOnInsert: { key: 'main', name: 'Jamia Demo Madarsa', address: 'Demo Address', academicSession: '2026-27', receiptFooter: 'Jazakallah khair' } }, { upsert: true });
  await AcademicSession.updateOne({ name: '2026-27' }, { $setOnInsert: { name: '2026-27', active: true } }, { upsert: true });
  await Course.updateOne({ name: 'Alimiyat' }, { $setOnInsert: { name: 'Alimiyat' } }, { upsert: true });
  const course = (await Course.findOne({ name: 'Alimiyat' }))!;
  await ClassLevel.updateOne({ course: course._id, name: 'Year 1' }, { $setOnInsert: {} }, { upsert: true });
  const cls = (await ClassLevel.findOne({ course: course._id, name: 'Year 1' }))!;
  for (const n of ['Fiqh', 'Hadith', 'Arabic']) await Subject.updateOne({ classLevel: cls._id, name: n }, { $setOnInsert: {} }, { upsert: true });
  if ((await Student.countDocuments()) === 0) {
    const year = new Date().getFullYear();
    for (const [name, father] of [['Abdullah Khan', 'Yusuf Khan'], ['Bilal Ahmed', 'Ahmed Raza'], ['Hamza Ali', 'Ali Hasan'], ['Ibrahim Siddiqui', 'Siddiq Alam'], ['Zaid Ansari', 'Omar Ansari']] as const)
      await Student.create({ name, fatherName: father, dob: new Date('2012-05-10'), gender: 'male', admissionNumber: `ADM-${year}-${String(await nextSequence(`admission:${year}`)).padStart(4, '0')}` });
  }
  if ((await FeeStructure.countDocuments()) === 0) await FeeStructure.create({ name: 'Monthly Tuition', amountPaise: 50000, frequency: 'monthly' });
  const fs = (await FeeStructure.findOne())!; const now = new Date();
  await generateDues(fs.id, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  if ((await Hostel.countDocuments()) === 0) { const h = await Hostel.create({ name: 'Main Hostel' }); const r = await Room.create({ hostel: h._id, number: '101' }); for (const l of ['A', 'B', 'C', 'D']) await Bed.create({ room: r._id, label: l }); }
  for (const [name, qty, thr] of [['Rice', 100, 20], ['Wheat Flour', 15, 20]] as const) await Item.updateOne({ name }, { $setOnInsert: { name, unit: 'kg', stockQty: qty, lowStockThreshold: thr } }, { upsert: true });
  if ((await BookTitle.countDocuments()) === 0) { const b = await BookTitle.create({ title: 'Riyad as-Salihin', author: 'Imam Nawawi', category: 'Hadith' }); await BookCopy.create([{ title: b._id, accessionNumber: 'ACC-0001' }, { title: b._id, accessionNumber: 'ACC-0002' }]); }
  if ((await Donor.countDocuments()) === 0) await Donor.create({ name: 'Haji Abdul Rahim', phone: '9000000000' });
  console.log('Seeded demo users (password: Demo@12345)'); await mongoose.disconnect();
})();
