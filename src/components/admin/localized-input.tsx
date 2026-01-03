"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface LocalizedInputProps {
  label: string;
  values: Record<Locale, string>;
  onChange: (locale: Locale, value: string) => void;
  type?: "text" | "textarea";
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
}

export function LocalizedInput({
  label,
  values,
  onChange,
  type = "text",
  placeholder,
  required = false,
  rows = 4,
  className,
}: LocalizedInputProps) {
  const [activeLocale, setActiveLocale] = React.useState<Locale>("en");

  const handleCopyFromEnglish = () => {
    if (activeLocale !== "en" && values.en) {
      onChange(activeLocale, values.en);
    }
  };

  const isComplete = (locale: Locale) => {
    return values[locale] && values[locale].trim().length > 0;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {activeLocale !== "en" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyFromEnglish}
            className="h-7 text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy from English
          </Button>
        )}
      </div>

      {/* Language Tabs */}
      <div className="flex gap-1 border-b">
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => setActiveLocale(locale)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              activeLocale === locale
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {localeNames[locale]}
            {!isComplete(locale) && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-yellow-500" title="Incomplete translation" />
            )}
            {isComplete(locale) && locale !== "en" && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500" title="Translation complete" />
            )}
          </button>
        ))}
      </div>

      {/* Input Fields */}
      <div className="pt-2">
        {locales.map((locale) => (
          <div
            key={locale}
            className={cn(
              "transition-all",
              activeLocale === locale ? "block" : "hidden"
            )}
            dir={locale === "ar" || locale === "he" ? "rtl" : "ltr"}
          >
            {type === "textarea" ? (
              <Textarea
                value={values[locale] || ""}
                onChange={(e) => onChange(locale, e.target.value)}
                placeholder={placeholder}
                required={required && locale === "en"}
                rows={rows}
                className="w-full"
              />
            ) : (
              <Input
                type="text"
                value={values[locale] || ""}
                onChange={(e) => onChange(locale, e.target.value)}
                placeholder={placeholder}
                required={required && locale === "en"}
                className="w-full"
              />
            )}
          </div>
        ))}
      </div>

      {/* Translation Status */}
      <div className="flex gap-2 text-xs text-muted-foreground">
        {locales.map((locale) => (
          <div key={locale} className="flex items-center gap-1">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isComplete(locale) ? "bg-green-500" : "bg-yellow-500"
              )}
            />
            <span>{localeNames[locale]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
