import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/madarsa_erp?replicaSet=rs0'),
  JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me-please'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
});
export const env = schema.parse(process.env);
if (env.NODE_ENV === 'production' && env.JWT_SECRET.startsWith('dev-only')) throw new Error('Set JWT_SECRET in production');
