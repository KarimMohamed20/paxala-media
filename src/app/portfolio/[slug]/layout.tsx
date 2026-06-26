import type { Metadata } from "next";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const item = await db.portfolio.findUnique({
      where: { slug },
      select: {
        titleEn: true,
        descriptionEn: true,
        thumbnail: true,
        published: true,
      },
    });
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

export default function PortfolioItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
