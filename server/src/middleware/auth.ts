import { RequestHandler, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, Role } from '../models/User';
import { AppError } from '../utils/errors';
import { can, Permission } from '../config/permissions';
declare global { namespace Express { interface Request { user?: { id: string; role: Role; username: string } } } }
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.token;
  if (!token) throw new AppError(401, 'Not authenticated', 'UNAUTHENTICATED');
  let payload: { sub: string };
  try { payload = jwt.verify(token, env.JWT_SECRET) as { sub: string }; }
  catch { throw new AppError(401, 'Invalid session', 'UNAUTHENTICATED'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new AppError(401, 'Account unavailable', 'UNAUTHENTICATED');
  req.user = { id: user.id, role: user.role as Role, username: user.username };
  next();
});
export const requirePermission = (p: Permission): RequestHandler => (req, _res, next) => {
  if (!req.user || !can(req.user.role, p)) return next(new AppError(403, 'Forbidden', 'FORBIDDEN'));
  next();
};
