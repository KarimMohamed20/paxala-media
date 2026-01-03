'use server';

import { cookies } from 'next/headers';
import { Locale, locales } from '@/i18n/config';

/**
 * Server action to set user's locale preference
 * Stores the locale in a cookie for persistence
 */
export async function setUserLocale(locale: string) {
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    throw new Error(`Invalid locale: ${locale}`);
  }

  const cookieStore = await cookies();

  // Set cookie with 1 year expiration
  cookieStore.set('NEXT_LOCALE', locale, {
    maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
    path: '/',
    sameSite: 'lax',
  });
}

/**
 * Get the current user locale from cookie
 */
export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');

  if (localeCookie && locales.includes(localeCookie.value as Locale)) {
    return localeCookie.value as Locale;
  }

  return 'en'; // Default locale
}
