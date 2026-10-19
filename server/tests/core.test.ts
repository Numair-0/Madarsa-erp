import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { toPaise, formatRupees } from '../src/utils/money';
let rs: MongoMemoryReplSet; const app = createApp();
beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(rs.getUri());
  const h = await bcrypt.hash('pw12345678', 4);
  await User.create([{ username: 'admin', name: 'A', role: 'admin', passwordHash: h }, { username: 'lib', name: 'L', role: 'librarian', passwordHash: h }]);
}, 120000);
afterAll(async () => { await mongoose.disconnect(); await rs?.stop(); });
const body = { name: 'Abdul Rahman', fatherName: 'Yusuf Khan', dob: '2012-03-04', gender: 'male' };
const loginAs = async (u: string) => { const a = request.agent(app); await a.post('/api/auth/login').send({ username: u, password: 'pw12345678' }).expect(200); return a; };
describe('money', () => { it('exact', () => { expect(toPaise('100.50')).toBe(10050); expect(formatRupees(10050)).toBe('₹100.50'); expect(() => toPaise('1.234')).toThrow(); }); });
describe('auth+students', () => {
  it('rejects bad login', async () => { await request(app).post('/api/auth/login').send({ username: 'admin', password: 'x' }).expect(401); });
  it('protects endpoints', async () => { await request(app).get('/api/students').expect(401); });
  it('enforces RBAC', async () => { const a = await loginAs('lib'); await a.post('/api/students').send(body).expect(403); });
  it('admits with sequential numbers, blocks duplicates & mass assignment', async () => {
    const a = await loginAs('admin');
    const r = await a.post('/api/students').send(body).expect(201);
    expect(r.body.data.admissionNumber).toMatch(/^ADM-\d{4}-0001$/);
    await a.post('/api/students').send(body).expect(409);
    await a.post('/api/students').send({ ...body, name: 'Other', admissionNumber: 'X' }).expect(400);
    const r2 = await a.post('/api/students').send({ ...body, name: 'Bilal Ahmed' }).expect(201);
    expect(r2.body.data.admissionNumber).toMatch(/0002$/);
    const s = await a.get('/api/students?search=bilal').expect(200);
    expect(s.body.data.total).toBe(1);
  });
});
