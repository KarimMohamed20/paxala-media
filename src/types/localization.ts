import { Locale } from '@/i18n/config';

export type LocalizedField<T> = {
  en: T;
  ar: T;
  he: T;
};

/**
 * Get localized value with fallback support
 * Falls back to English if the requested locale is not available
 */
export function getLocalizedValue<T>(
  field: LocalizedField<T>,
  locale: Locale,
  fallbackLocale: Locale = 'en'
): T {
  return field[locale] || field[fallbackLocale];
}

/**
 * Get the field name with locale suffix (e.g., 'name' + 'en' = 'nameEn')
 */
export function getLocalizedFieldName(
  baseFieldName: string,
  locale: Locale
): string {
  const suffix = locale.charAt(0).toUpperCase() + locale.slice(1);
  return `${baseFieldName}${suffix}`;
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Transform a database object to return only locale-specific fields
 * This removes the locale suffix from field names
 */
export function extractLocalizedFields<T extends Record<string, any>>(
  data: T,
  locale: Locale,
  fields: string[]
): Partial<T> {
  const result: any = {};
  const suffix = capitalize(locale);

  // Copy non-localized fields as-is
  for (const key in data) {
    if (!fields.some(field => key.startsWith(field))) {
      result[key] = data[key];
    }
  }

  // Map localized fields (remove suffix)
  for (const field of fields) {
    const localizedKey = `${field}${suffix}`;
    if (localizedKey in data) {
      result[field] = data[localizedKey];
    }
  }

  return result;
}

/**
 * Get locale from request header or cookie
 */
export function getLocaleFromHeader(
  request: Request,
  defaultLocale: Locale = 'en'
): Locale {
  const locale = request.headers.get('x-locale');
  if (locale && ['en', 'ar', 'he'].includes(locale)) {
    return locale as Locale;
  }
  return defaultLocale;
}
