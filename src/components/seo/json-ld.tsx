import { organizationLdJson } from "@/lib/seo";

/**
 * Generic JSON-LD <script> renderer. Escapes "<" so a "</script>" in any value
 * can't break out of the tag. Pass a single schema object or an array (graph).
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * Site-wide Organization + LocalBusiness structured data.
 * Rendered once in the root layout. The payload is fully static/controlled
 * (no user input), so `dangerouslySetInnerHTML` is the standard, safe way to
 * emit JSON-LD here.
 */
export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // Escape "<" so a "</script>" in any value can't break out of the tag.
        __html: JSON.stringify(organizationLdJson()).replace(/</g, "\\u003c"),
      }}
    />
  );
}
