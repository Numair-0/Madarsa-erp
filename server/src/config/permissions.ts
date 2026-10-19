import type { Role } from '../models/User';
export type Permission = `${string}:${string}`;
// Static defaults; DB-backed role editing is a planned phase.
export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ['*:*'], admin: ['*:*'],
  principal: ['students:view','students:create','students:edit','results:view','results:finalize','results:approve','academics:view','academics:manage','reports:view','audit:view'],
  accountant: ['students:view','fees:view','fees:collect','accounting:view','accounting:create','reports:view','donations:view','donations:create'],
  librarian: ['students:view','library:view','library:issue','library:return','library:manage'],
  hostel_incharge: ['students:view','hostel:view','hostel:manage'],
  mess_incharge: ['kitchen:view','kitchen:create'],
  storekeeper: ['inventory:view','inventory:create','inventory:manage','kitchen:view','kitchen:fulfill'],
  teacher: ['students:view','results:view','results:create','academics:view'],
};
const current: Record<Role, Permission[]> = structuredClone(DEFAULT_PERMISSIONS);
export const setRolePermissions = (r: Role, p: Permission[]) => { current[r] = p; };
export const getRolePermissions = (r: Role) => current[r];
export const RESOURCES = ['students','fees','accounting','library','hostel','kitchen','inventory','donations','reports','results','users','roles','settings','audit','academics'];
export const ACTIONS = ['view','create','edit','delete','approve','reject','export','print','collect','issue','return','finalize','manage','fulfill'];
export const isValidPermission = (p: string) => { const [r, a, ...x] = p.split(':'); return p === '*:*' || (x.length === 0 && !!r && !!a && RESOURCES.includes(r) && ACTIONS.includes(a)); };
export const can = (role: Role, p: Permission) => {
  const g = current[role]; const [res] = p.split(':');
  return g.includes('*:*') || g.includes(p) || g.includes(`${res}:manage` as Permission);
};
