import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize rich-text (tiptap) HTML before rendering it via
 * `dangerouslySetInnerHTML`. Strips scripts, event handlers, and
 * `javascript:` URIs while keeping standard formatting markup, so a
 * malicious/compromised author can't inject stored XSS into public pages.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
