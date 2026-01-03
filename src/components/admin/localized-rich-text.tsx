"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { Copy, Eye, Code } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LocalizedRichTextProps {
  label: string;
  values: Record<Locale, string>;
  onChange: (locale: Locale, value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
  showPreview?: boolean;
}

export function LocalizedRichText({
  label,
  values,
  onChange,
  placeholder,
  required = false,
  rows = 12,
  className,
  showPreview = false,
}: LocalizedRichTextProps) {
  const [activeLocale, setActiveLocale] = React.useState<Locale>("en");
  const [viewMode, setViewMode] = React.useState<"edit" | "preview">("edit");

  const handleCopyFromEnglish = () => {
    if (activeLocale !== "en" && values.en) {
      onChange(activeLocale, values.en);
    }
  };

  const isComplete = (locale: Locale) => {
    return values[locale] && values[locale].trim().length > 0;
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex gap-2">
          {showPreview && (
            <div className="flex border rounded-md">
              <Button
                type="button"
                variant={viewMode === "edit" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("edit")}
                className="h-7 rounded-r-none"
              >
                <Code className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                type="button"
                variant={viewMode === "preview" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("preview")}
                className="h-7 rounded-l-none"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
            </div>
          )}
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

      {/* Content Area */}
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
            {viewMode === "edit" ? (
              <Textarea
                value={values[locale] || ""}
                onChange={(e) => onChange(locale, e.target.value)}
                placeholder={placeholder}
                required={required && locale === "en"}
                rows={rows}
                className="w-full font-mono text-sm"
              />
            ) : (
              <div className="border rounded-md p-4 min-h-[300px] bg-muted/20">
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: values[locale]
                      ? values[locale]
                          .replace(/\n/g, "<br />")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                      : "<p class='text-muted-foreground'>No content to preview</p>",
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {locales.map((locale) => (
          <div key={locale} className="flex items-center gap-1">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isComplete(locale) ? "bg-green-500" : "bg-yellow-500"
              )}
            />
            <span>
              {localeNames[locale]}: {getWordCount(values[locale] || "")} words
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
