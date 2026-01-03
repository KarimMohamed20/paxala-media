import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from './i18n/config';

export function middleware(request: NextRequest) {
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
  // Match all routes except static files and API routes that don't need locale
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'

],
};
