"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { Copy, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LocalizedArrayInputProps {
  label: string;
  values: Record<Locale, string[]>;
  onChange: (locale: Locale, value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function LocalizedArrayInput({
  label,
  values,
  onChange,
  placeholder = "Add item...",
  className,
}: LocalizedArrayInputProps) {
  const [activeLocale, setActiveLocale] = React.useState<Locale>("en");
  const [inputValue, setInputValue] = React.useState("");

  const handleAdd = () => {
    if (inputValue.trim()) {
      const currentValues = values[activeLocale] || [];
      onChange(activeLocale, [...currentValues, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleRemove = (index: number) => {
    const currentValues = values[activeLocale] || [];
    onChange(
      activeLocale,
      currentValues.filter((_, i) => i !== index)
    );
  };

  const handleCopyFromEnglish = () => {
    if (activeLocale !== "en" && values.en) {
      onChange(activeLocale, [...values.en]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const isComplete = (locale: Locale) => {
    return values[locale] && values[locale].length > 0;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
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
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-yellow-500" title="No items" />
            )}
            {isComplete(locale) && locale !== "en" && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500" title="Has items" />
            )}
          </button>
        ))}
      </div>

      {/* Input Section */}
      <div className="pt-2">
        {locales.map((locale) => (
          <div
            key={locale}
            className={cn(
              "space-y-2",
              activeLocale === locale ? "block" : "hidden"
            )}
            dir={locale === "ar" || locale === "he" ? "rtl" : "ltr"}
          >
            {/* Add Item Input */}
            <div className="flex gap-2">
              <Input
                type="text"
                value={activeLocale === locale ? inputValue : ""}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAdd}
                size="sm"
                variant="secondary"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items List */}
            <div className="flex flex-wrap gap-2">
              {(values[locale] || []).map((item, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(!values[locale] || values[locale].length === 0) && (
                <p className="text-sm text-muted-foreground">No items added yet</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Item Count Status */}
      <div className="flex gap-2 text-xs text-muted-foreground">
        {locales.map((locale) => (
          <div key={locale} className="flex items-center gap-1">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isComplete(locale) ? "bg-green-500" : "bg-yellow-500"
              )}
            />
            <span>
              {localeNames[locale]}: {(values[locale] || []).length} items
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
