import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants";

/**
 * Canonical site origin (no trailing slash).
 * Set NEXT_PUBLIC_SITE_URL in production to the ONE canonical domain — the repo
 * currently mixes paxaland.com / paxalamedia.com, which splits SEO signals.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(
  /\/$/,
  ""
);

const DEFAULT_OG_IMAGE = "/og-image.png";

/** Resolve a path (or pass through an already-absolute URL) to an absolute URL. */
export function absoluteUrl(pathOrUrl = "/"): string {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

/**
 * Build a Metadata object for a marketing page with a canonical URL plus Open
 * Graph / Twitter cards. The root layout supplies the title template
 * (`%s | Paxala Media`) and site-wide defaults.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(opts.path);
  const image = absoluteUrl(opts.image || DEFAULT_OG_IMAGE);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: opts.type || "website",
      url,
      title: opts.title,
      description: opts.description,
      siteName: "Paxala Media",
      images: [{ url: image, width: 1200, height: 630, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}

const SOCIAL_PROFILES = [
  siteConfig.social.instagram,
  siteConfig.social.facebook,
  siteConfig.social.youtube,
  siteConfig.social.linkedin,
];

/** Article structured data for a blog post detail page. */
export function articleLdJson(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    image: absoluteUrl(opts.image || "/og-image.png"),
    datePublished: opts.datePublished || undefined,
    dateModified: opts.dateModified || opts.datePublished || undefined,
    mainEntityOfPage: absoluteUrl(opts.path),
    author: { "@type": "Organization", name: siteConfig.name, url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/** CreativeWork structured data for a portfolio item detail page. */
export function creativeWorkLdJson(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: opts.title,
    description: opts.description,
    image: absoluteUrl(opts.image || "/og-image.png"),
    url: absoluteUrl(opts.path),
    creator: { "@id": `${SITE_URL}/#organization` },
  };
}

/** BreadcrumbList structured data. */
export function breadcrumbLdJson(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

/**
 * Site-wide Organization + LocalBusiness (ProfessionalService) structured data.
 * Helps PMP show up as a local business in Arabic/Hebrew/English search and maps.
 * NOTE: geo coordinates are approximate for Sakhnin — refine with the exact
 * studio location if you want precise map placement.
 */
export function organizationLdJson() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: siteConfig.name,
        alternateName: siteConfig.shortName,
        url: SITE_URL,
        email: siteConfig.email,
        telephone: siteConfig.phone,
        logo: absoluteUrl("/images/logo/pmp.png"),
        image: absoluteUrl(DEFAULT_OG_IMAGE),
        description: siteConfig.description,
        sameAs: SOCIAL_PROFILES,
      },
      {
        "@type": "ProfessionalService",
        "@id": `${SITE_URL}/#localbusiness`,
        name: siteConfig.name,
        url: SITE_URL,
        image: absoluteUrl(DEFAULT_OG_IMAGE),
        email: siteConfig.email,
        telephone: siteConfig.phone,
        priceRange: "$$",
        description: siteConfig.description,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Sakhnin",
          addressCountry: "Palestine",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 32.8647,
          longitude: 35.2972,
        },
        areaServed: ["Sakhnin", "Galilee", "Northern District"],
        knowsLanguage: ["ar", "he", "en"],
        sameAs: SOCIAL_PROFILES,
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Sunday"],
            opens: "09:00",
            closes: "17:00",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
            opens: "08:00",
            closes: "17:00",
          },
        ],
      },
    ],
  };
}
