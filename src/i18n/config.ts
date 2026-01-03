export const locales = ['en', 'ar', 'he'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  he: 'עברית',
};

export const rtlLocales: Locale[] = ['ar', 'he'];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
