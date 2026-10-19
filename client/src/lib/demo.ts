/**
 * Demo mode flag — enabled when NEXT_PUBLIC_DEMO_MODE=true.
 * When enabled, all API calls return deterministic mock data.
 * When disabled, the application behaves normally with real backend APIs.
 *
 * IMPORTANT: This flag is evaluated at build time by Next.js.
 * Set NEXT_PUBLIC_DEMO_MODE=true in .env.local or Vercel env vars before building.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
