import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
let rs: MongoMemoryReplSet; const app = createApp(); const ids: Record<string, string> = {};
const login = async (u: string) => { const a = request.agent(app); await a.post('/api/auth/login').send({ username: u, password: 'pw12345678' }).expect(200); return a; };
beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(rs.getUri());
  const h = await bcrypt.hash('pw12345678', 4);
  for (const [u, r] of [['root', 'super_admin'], ['adm', 'admin'], ['acc', 'accountant']] as const) ids[u] = (await User.create({ username: u, name: u, role: r, passwordHash: h })).id;
}, 120000);
afterAll(async () => { await mongoose.disconnect(); await rs?.stop(); });
describe('admin', () => {
  it('only admins manage users/settings', async () => { const a = await login('acc'); await a.post('/api/users').send({ username: 'x1x', name: 'XX', password: 'abc12345', role: 'teacher' }).expect(403); await a.put('/api/settings').send({ name: 'Foo' }).expect(403); });
  it('prevents privilege escalation and self-lockout', async () => {
    const a = await login('adm');
    await a.post('/api/users').send({ username: 'evil', name: 'Evil', password: 'abc12345', role: 'super_admin' }).expect(403);
    await a.patch(`/api/users/${ids.adm}`).send({ active: false }).expect(403);
    await a.patch(`/api/users/${ids.root}`).send({ active: false }).expect(403);
    await a.post('/api/users').send({ username: 't1', name: 'Teach', password: 'abc12345', role: 'teacher' }).expect(201);
    await a.post('/api/users').send({ username: 't2', name: 'Teach', password: 'short', role: 'teacher' }).expect(400);
  });
  it('role permission edits take effect and are validated', async () => {
    const a = await login('adm'); const acc = await login('acc');
    await acc.get('/api/users').expect(403);
    await a.put('/api/roles/accountant/permissions').send({ permissions: ['users:view'] }).expect(200);
    await acc.get('/api/users').expect(200);
    await a.put('/api/roles/accountant/permissions').send({ permissions: ['bogus:thing'] }).expect(400);
    await a.put('/api/roles/super_admin/permissions').send({ permissions: [] }).expect(403);
  });
  it('settings round trip + audit', async () => {
    const a = await login('adm'); await a.put('/api/settings').send({ name: 'Jamia Test', receiptFooter: 'Thank you' }).expect(200);
    expect((await a.get('/api/settings').expect(200)).body.data.name).toBe('Jamia Test');
    expect((await a.get('/api/audit-logs?module=settings').expect(200)).body.data.total).toBeGreaterThan(0);
  });
});
