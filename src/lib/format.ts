// Locale-aware formatting helpers (Intl-based) so dates, numbers, and currency
// render in the active language (Arabic/Hebrew month names, native numerals)
// instead of hardcoded English.

const LOCALE_TAG: Record<string, string> = {
  ar: "ar-EG",
  he: "he-IL",
  en: "en-US",
};

function tagFor(locale: string): string {
  return LOCALE_TAG[locale] ?? "en-US";
}

export function formatDateLocalized(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  return new Intl.DateTimeFormat(tagFor(locale), options).format(new Date(date));
}

export function formatNumberLocalized(value: number, locale: string): string {
  return new Intl.NumberFormat(tagFor(locale)).format(value);
}

export function formatCurrencyLocalized(
  value: number,
  locale: string,
  currency = "ILS"
): string {
  return new Intl.NumberFormat(tagFor(locale), {
    style: "currency",
    currency,
  }).format(value);
}
