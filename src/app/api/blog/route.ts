import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { localizeBlogPost } from "@/lib/localization-utils";
import { defaultLocale, type Locale } from "@/i18n/config";

// GET - Fetch all blog posts (public for published, admin/staff see all)
export async function GET(request: NextRequest) {
  try {
    // Get locale from headers
    const locale = (request.headers.get('x-locale') || defaultLocale) as Locale;

    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get("published") === "true";

    const isAdminOrStaff = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";

    const where: any = {};

    // Only show published posts to non-admin/staff users
    if (!isAdminOrStaff || publishedOnly) {
      where.published = true;
    }

    const posts = await db.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titleEn: true,
        titleAr: true,
        titleHe: true,
        slug: true,
        excerptEn: true,
        excerptAr: true,
        excerptHe: true,
        coverImage: true,
        category: true,
        tagsEn: true,
        tagsAr: true,
        tagsHe: true,
        published: true,
        publishedAt: true,
        views: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Localize each blog post
    const localizedPosts = posts.map(post => localizeBlogPost(post, locale));

    return NextResponse.json(localizedPosts);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    );
  }
}

// POST - Create new blog post (admin/staff only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Generate slug from English title if not provided
    const slug = data.slug || data.titleEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const post = await db.blogPost.create({
      data: {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        titleHe: data.titleHe,
        slug,
        excerptEn: data.excerptEn,
        excerptAr: data.excerptAr,
        excerptHe: data.excerptHe,
        contentEn: data.contentEn,
        contentAr: data.contentAr,
        contentHe: data.contentHe,
        coverImage: data.coverImage || null,
        authorId: session.user.id,
        category: data.category,
        tagsEn: data.tagsEn || [],
        tagsAr: data.tagsAr || [],
        tagsHe: data.tagsHe || [],
        published: data.published || false,
        publishedAt: data.published ? new Date() : null,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error creating blog post:", error);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 }
    );
  }
}
