// FILE PATH: middleware.ts  (project root — same level as package.json)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'meraki_token';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/google',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always pass through public routes and Next.js internals
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/';

  if (isPublic) return NextResponse.next();

  // Read the token cookie — set by tokenStore.set() in the browser
  // Cookies ARE readable server-side, unlike localStorage
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // No token → redirect to login, preserving intended destination
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on dashboard routes
  matcher: ['/dashboard/:path*'],
};