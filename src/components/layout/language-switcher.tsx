'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { setUserLocale } from '@/lib/locale-actions';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(newLocale: Locale) {
    startTransition(async () => {
      await setUserLocale(newLocale);
      // Reload the page to apply the new locale
      window.location.reload();
    });
  }

  return (
    <div className="relative group">
      {/* Current Language Button */}
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        disabled={isPending}
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{localeNames[locale]}</span>
        <svg
          className="w-4 h-4 transition-transform group-hover:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div className="absolute right-0 mt-2 w-40 bg-black/95 backdrop-blur-lg border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            disabled={isPending || locale === loc}
            className={`
              w-full text-left px-4 py-3 text-sm transition-colors
              first:rounded-t-lg last:rounded-b-lg
              ${
                locale === loc
                  ? 'bg-white/20 text-white font-semibold'
                  : 'hover:bg-white/10 text-white/80'
              }
              ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {localeNames[loc]}
            {locale === loc && (
              <span className="ml-2 text-xs">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version for mobile menu
 */
export function LanguageSwitcherMobile() {
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(newLocale: Locale) {
    startTransition(async () => {
      await setUserLocale(newLocale);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-white/60">
        <Globe className="w-4 h-4" />
        <span>Language</span>
      </div>
      <div className="space-y-1">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            disabled={isPending || locale === loc}
            className={`
              w-full text-left px-4 py-3 text-sm transition-colors
              ${
                locale === loc
                  ? 'bg-white/10 text-white font-semibold'
                  : 'hover:bg-white/5 text-white/80'
              }
              ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {localeNames[loc]}
            {locale === loc && (
              <span className="ml-2 text-xs">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
