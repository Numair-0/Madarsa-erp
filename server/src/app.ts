import express, { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { env } from './config/env';
import { api } from './routes';
import { AppError } from './utils/errors';
export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.get('/health', (_req, res) => { res.json({ ok: true }); });
  app.use('/api', api);
  app.use((_req, res) => { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }); });
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid input', details: err.flatten() } });
    if (err instanceof AppError) return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
    if ((err as { code?: number }).code === 11000) return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Duplicate record' } });
    console.error(err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: env.NODE_ENV === 'production' ? 'Internal error' : String(err.message) } });
  };
  app.use(onError);
  return app;
}
