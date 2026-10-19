import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import { audit } from './audit.service';
const DUMMY = bcrypt.hashSync('dummy-password', 10);
export async function login(username: string, password: string) {
  const user = await User.findOne({ username: username.toLowerCase() }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY);
  if (!user || !ok || !user.active) {
    await audit({ action: 'login_failed', module: 'auth', meta: { username } });
    throw new AppError(401, 'Invalid username or password', 'INVALID_CREDENTIALS');
  }
  await audit({ actor: user.id, action: 'login', module: 'auth' });
  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '8h' });
  return { token, user: { id: user.id, name: user.name, username: user.username, role: user.role } };
}
