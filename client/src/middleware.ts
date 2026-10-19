import { NextRequest, NextResponse } from 'next/server';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// UX-only redirect. The Express API is the real authorization boundary.
export function middleware(req: NextRequest) {
  // In demo mode, allow all navigation without an auth cookie
  if (DEMO) return NextResponse.next();
  if (!req.cookies.get('token')) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*', '/students/:path*', '/fees/:path*', '/settings/:path*'] };
