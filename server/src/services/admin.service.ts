import bcrypt from 'bcryptjs';
import { User, Role, ROLES } from '../models/User';
import { Settings, RolePermission } from '../models/Settings';
import { AppError } from '../utils/errors';
import { audit } from './audit.service';
import { DEFAULT_PERMISSIONS, Permission, getRolePermissions, isValidPermission, setRolePermissions } from '../config/permissions';
export const getSettings = () => Settings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
export async function updateSettings(patch: Record<string, unknown>, actor: string) {
  const before = await getSettings();
  const after = await Settings.findOneAndUpdate({ key: 'main' }, { $set: patch }, { upsert: true, new: true }).lean();
  await audit({ actor, action: 'update', module: 'settings', entity: 'Settings', before, after });
  return after;
}
const guardSuper = (actor: { role: Role }, target: Role) => { if (target === 'super_admin' && actor.role !== 'super_admin') throw new AppError(403, 'Only a super admin can manage super admin accounts', 'FORBIDDEN'); };
export async function createUser(i: { username: string; name: string; password: string; role: Role }, actor: { id: string; role: Role }) {
  guardSuper(actor, i.role);
  const u = await User.create({ username: i.username, name: i.name, role: i.role, passwordHash: await bcrypt.hash(i.password, 10) });
  await audit({ actor: actor.id, action: 'create', module: 'users', entity: 'User', entityId: u.id, after: { username: u.username, role: u.role } });
  return { id: u.id, username: u.username, name: u.name, role: u.role, active: u.active };
}
export async function updateUser(id: string, patch: { name?: string | undefined; role?: Role | undefined; active?: boolean | undefined }, actor: { id: string; role: Role }) {
  const target = await User.findById(id);
  if (!target) throw new AppError(404, 'User not found');
  if (id === actor.id && (patch.role !== undefined || patch.active !== undefined)) throw new AppError(403, 'You cannot change your own role or status', 'FORBIDDEN');
  guardSuper(actor, target.role as Role); if (patch.role) guardSuper(actor, patch.role);
  const before = { name: target.name, role: target.role, active: target.active };
  if (patch.name !== undefined) target.name = patch.name; if (patch.role !== undefined) target.role = patch.role; if (patch.active !== undefined) target.active = patch.active;
  await target.save();
  await audit({ actor: actor.id, action: 'update', module: 'users', entity: 'User', entityId: id, before, after: { name: target.name, role: target.role, active: target.active } });
  return { id, username: target.username, name: target.name, role: target.role, active: target.active };
}
export async function resetPassword(id: string, password: string, actor: { id: string; role: Role }) {
  const target = await User.findById(id); if (!target) throw new AppError(404, 'User not found');
  guardSuper(actor, target.role as Role);
  await User.updateOne({ _id: id }, { passwordHash: await bcrypt.hash(password, 10) });
  await audit({ actor: actor.id, action: 'reset_password', module: 'users', entity: 'User', entityId: id });
}
export const listRoles = () => ROLES.map(r => ({ role: r, permissions: getRolePermissions(r), editable: r !== 'super_admin' }));
export async function setPermissions(role: Role, perms: string[], actor: string) {
  if (role === 'super_admin') throw new AppError(403, 'Super admin permissions are fixed', 'FORBIDDEN');
  const bad = perms.filter(p => !isValidPermission(p)); if (bad.length) throw new AppError(400, `Unknown permissions: ${bad.join(', ')}`, 'BAD_PERMISSION');
  const unique = [...new Set(perms)] as Permission[]; const before = getRolePermissions(role);
  await RolePermission.updateOne({ role }, { permissions: unique }, { upsert: true });
  setRolePermissions(role, unique);
  await audit({ actor, action: 'permissions_change', module: 'roles', entity: 'Role', entityId: role, before, after: unique });
  return { role, permissions: unique };
}
/** Load DB overrides into the in-memory map at startup (single-process cache; restart or re-PUT to refresh other instances). */
export async function loadPermissionOverrides() { for (const r of await RolePermission.find().lean()) if ((r.role as Role) in DEFAULT_PERMISSIONS) setRolePermissions(r.role as Role, r.permissions as Permission[]); }
