import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/lib/db";
import { pageMetadata, articleLdJson, breadcrumbLdJson } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

// Cached so generateMetadata and the layout share a single query per request.
const getPost = cache((slug: string) =>
  db.blogPost.findUnique({
    where: { slug },
    select: {
      titleEn: true,
      excerptEn: true,
      coverImage: true,
      published: true,
      publishedAt: true,
      updatedAt: true,
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
    const post = await getPost(slug);
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

export default async function BlogPostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let graph: unknown[] | null = null;
  try {
    const post = await getPost(slug);
    if (post?.published) {
      graph = [
        articleLdJson({
          title: post.titleEn,
          description: post.excerptEn.slice(0, 160),
          path: `/blog/${slug}`,
          image: post.coverImage,
          datePublished: post.publishedAt?.toISOString() ?? null,
          dateModified: post.updatedAt?.toISOString() ?? null,
        }),
        breadcrumbLdJson([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.titleEn, path: `/blog/${slug}` },
        ]),
      ];
    }
  } catch (error) {
    console.error("blog json-ld error", error);
  }

  return (
    <>
      {graph && <JsonLd data={graph} />}
      {children}
    </>
  );
}
