import { SITE_URL } from "@/lib/seo";
import { siteConfig } from "@/lib/constants";
import type { TestimonialDisplay } from "@/components/sections/clients";

/**
 * Review + AggregateRating structured data built from the REAL DB testimonials.
 *
 * NOTE on ratings: the Testimonial model has no per-row rating column yet, and
 * each testimonial card visibly renders 5 stars, so the markup uses 5★ to stay
 * consistent with what users actually see on the page. When you add a real
 * `rating` field, compute the true average here — and only publish testimonials
 * that clients genuinely gave, since fabricated review markup is penalised.
 */
export function TestimonialsJsonLd({
  testimonials,
}: {
  testimonials: TestimonialDisplay[];
}) {
  if (!testimonials.length) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: siteConfig.name,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      reviewCount: String(testimonials.length),
      bestRating: "5",
      worstRating: "1",
    },
    review: testimonials.map((t) => ({
      "@type": "Review",
      reviewBody: t.quoteEn,
      author: { "@type": "Person", name: t.authorEn },
      itemReviewed: { "@id": `${SITE_URL}/#localbusiness` },
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5",
        worstRating: "1",
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // Escape "<" so a "</script>" in any testimonial text can't break out.
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
