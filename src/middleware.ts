import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { defaultLocale, locales } from './i18n/config';

// Portal pages that must stay reachable without a session
const PUBLIC_PORTAL_PATHS = ['/portal/login', '/portal/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Server-side protection for /admin, /staff, /portal ----
  const needsAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const needsStaff = pathname === '/staff' || pathname.startsWith('/staff/');
  const needsSession =
    (pathname === '/portal' || pathname.startsWith('/portal/')) &&
    !PUBLIC_PORTAL_PATHS.some((p) => pathname.startsWith(p));

  if (needsAdmin || needsStaff || needsSession) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string | undefined;
    if (needsAdmin && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
    if (needsStaff && role !== 'ADMIN' && role !== 'STAFF') {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
  }

  // Get locale from cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE');

  // Validate locale or use default
  const locale =
    localeCookie &&
    locales.includes(localeCookie.value as any)
      ? localeCookie.value
      : defaultLocale;

  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Set the locale header for API routes to use
  requestHeaders.set('x-locale', locale);

  // Continue with the request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/projects/upload|.*\\..*).*)'
],
};
