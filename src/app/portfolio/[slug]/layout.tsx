import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/lib/db";
import { pageMetadata, creativeWorkLdJson, breadcrumbLdJson } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

// Cached so generateMetadata and the layout share a single query per request.
const getPortfolio = cache((slug: string) =>
  db.portfolio.findUnique({
    where: { slug },
    select: {
      titleEn: true,
      descriptionEn: true,
      thumbnail: true,
      published: true,
    },
  })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const item = await getPortfolio(slug);
    if (item?.published) {
      return pageMetadata({
        title: item.titleEn,
        description: item.descriptionEn.slice(0, 160),
        path: `/portfolio/${slug}`,
        image: item.thumbnail || undefined,
        type: "article",
      });
    }
  } catch (error) {
    console.error("portfolio metadata error", error);
  }
  // Unknown or unpublished item — don't let it be indexed as a thin/duplicate page.
  return {
    ...pageMetadata({
      title: "Portfolio",
      description: "Selected work by Paxala Media Production.",
      path: `/portfolio/${slug}`,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function PortfolioItemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let graph: unknown[] | null = null;
  try {
    const item = await getPortfolio(slug);
    if (item?.published) {
      graph = [
        creativeWorkLdJson({
          title: item.titleEn,
          description: item.descriptionEn.slice(0, 160),
          path: `/portfolio/${slug}`,
          image: item.thumbnail,
        }),
        breadcrumbLdJson([
          { name: "Home", path: "/" },
          { name: "Portfolio", path: "/portfolio" },
          { name: item.titleEn, path: `/portfolio/${slug}` },
        ]),
      ];
    }
  } catch (error) {
    console.error("portfolio json-ld error", error);
  }

  return (
    <>
      {graph && <JsonLd data={graph} />}
      {children}
    </>
  );
}
