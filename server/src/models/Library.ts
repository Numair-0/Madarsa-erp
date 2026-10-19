import { Schema, model } from 'mongoose';
const ref = (name: string) => ({ type: Schema.Types.ObjectId, ref: name, required: true });
const title = new Schema({ title: { type: String, required: true }, author: String, publisher: String, category: String }, { timestamps: true });
title.index({ title: 1 });
export const BookTitle = model('BookTitle', title);
const copy = new Schema({ accessionNumber: { type: String, required: true, unique: true }, title: ref('BookTitle'),
  status: { type: String, enum: ['available', 'issued', 'lost', 'damaged'], default: 'available' } }, { timestamps: true });
copy.index({ title: 1, status: 1 });
export const BookCopy = model('BookCopy', copy);
const issue = new Schema({ copy: ref('BookCopy'), student: ref('Student'), issuedAt: { type: Date, default: Date.now }, dueDate: { type: Date, required: true },
  returnedAt: Date, status: { type: String, enum: ['issued', 'returned', 'lost'], default: 'issued' },
  finePaise: { type: Number, default: 0, min: 0, validate: Number.isInteger }, condition: { type: String, enum: ['good', 'damaged', 'lost'] },
  issuedBy: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
issue.index({ copy: 1 }, { unique: true, partialFilterExpression: { status: 'issued' } }); // no duplicate active issue
issue.index({ student: 1, issuedAt: -1 }); issue.index({ status: 1, dueDate: 1 });
export const Issue = model('Issue', issue);
