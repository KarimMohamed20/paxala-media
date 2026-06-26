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
    const post = await db.blogPost.findUnique({
      where: { slug },
      select: {
        titleEn: true,
        excerptEn: true,
        coverImage: true,
        published: true,
      },
    });
    if (post?.published) {
      return pageMetadata({
        title: post.titleEn,
        description: post.excerptEn.slice(0, 160),
        path: `/blog/${slug}`,
        image: post.coverImage || undefined,
        type: "article",
      });
    }
  } catch (error) {
    console.error("blog metadata error", error);
  }
  // Unknown or unpublished post — don't let it be indexed as a thin/duplicate page.
  return {
    ...pageMetadata({
      title: "Blog",
      description: "Insights from Paxala Media Production.",
      path: `/blog/${slug}`,
    }),
    robots: { index: false, follow: false },
  };
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
