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

/** `value` is 0-100, not a fraction — every percent the reports API returns is. */
export function formatPercentLocalized(
  value: number,
  locale: string,
  maxFrac = 0
): string {
  return new Intl.NumberFormat(tagFor(locale), {
    style: "percent",
    maximumFractionDigits: maxFrac,
  }).format(value / 100);
}

/**
 * Signed number for deltas. Never concatenate "+" by hand — the bidi algorithm
 * relocates a literal plus sign in Arabic and Hebrew.
 */
export function formatSignedLocalized(
  value: number,
  locale: string,
  maxFrac = 1
): string {
  return new Intl.NumberFormat(tagFor(locale), {
    signDisplay: "exceptZero",
    maximumFractionDigits: maxFrac,
  }).format(value);
}

/** Compact notation ("1.2K") — the guard against axis labels running off. */
export function formatCompactLocalized(value: number, locale: string): string {
  return new Intl.NumberFormat(tagFor(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Localized byte size via Intl units — no unit strings to translate. */
export function formatBytesLocalized(bytes: number, locale: string): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const;
  let value = Math.max(0, bytes);
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return new Intl.NumberFormat(tagFor(locale), {
    style: "unit",
    unit: units[i],
    unitDisplay: "narrow",
    maximumFractionDigits: i === 0 ? 0 : 1,
  }).format(value);
}

/** Localized day count ("1.8d"). Same rationale — Intl owns the unit name. */
export function formatDaysLocalized(
  days: number,
  locale: string,
  maxFrac = 1
): string {
  return new Intl.NumberFormat(tagFor(locale), {
    style: "unit",
    unit: "day",
    unitDisplay: "narrow",
    maximumFractionDigits: maxFrac,
  }).format(days);
}
