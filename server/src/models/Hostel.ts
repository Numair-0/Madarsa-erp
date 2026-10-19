import { Schema, model } from 'mongoose';
const ref = (name: string) => ({ type: Schema.Types.ObjectId, ref: name, required: true });
export const Hostel = model('Hostel', new Schema({ name: { type: String, required: true, unique: true } }, { timestamps: true }));
const room = new Schema({ hostel: ref('Hostel'), floor: { type: String, default: 'Ground' }, number: { type: String, required: true } }, { timestamps: true });
room.index({ hostel: 1, number: 1 }, { unique: true });
export const Room = model('Room', room);
const bed = new Schema({ room: ref('Room'), label: { type: String, required: true } }, { timestamps: true });
bed.index({ room: 1, label: 1 }, { unique: true });
export const Bed = model('Bed', bed);
const alloc = new Schema({ student: ref('Student'), bed: ref('Bed'), status: { type: String, enum: ['active', 'released'], default: 'active' },
  allocatedAt: { type: Date, default: Date.now }, releasedAt: Date, releaseReason: String, allocatedBy: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
// DB-level guarantees: one active allocation per bed and per student.
alloc.index({ bed: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
alloc.index({ student: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
alloc.index({ student: 1, allocatedAt: -1 });
export const Allocation = model('Allocation', alloc);
