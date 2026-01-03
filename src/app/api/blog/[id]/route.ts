import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { localizeBlogPost } from "@/lib/localization-utils";
import { defaultLocale, type Locale } from "@/i18n/config";

// GET - Fetch single blog post by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const allLocales = searchParams.get('allLocales') === 'true';

    const post = await db.blogPost.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment views (only for public requests, not admin)
    if (!allLocales) {
      await db.blogPost.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
    }

    // If admin request, return all localized fields
    if (allLocales) {
      return NextResponse.json(post);
    }

    // Otherwise, localize for public use
    const locale = (request.headers.get('x-locale') || defaultLocale) as Locale;
    const localizedPost = localizeBlogPost(post, locale);

    return NextResponse.json(localizedPost);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 }
    );
  }
}

// PUT - Update blog post (admin/staff only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // Check if post exists
    const existingPost = await db.blogPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Generate slug from English title if not provided
    const slug = data.slug || data.titleEn
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const updateData: any = {
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
      coverImage: data.coverImage,
      category: data.category,
      tagsEn: data.tagsEn,
      tagsAr: data.tagsAr,
      tagsHe: data.tagsHe,
      published: data.published,
    };

    // Set publishedAt when publishing for the first time
    if (data.published && !existingPost.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const post = await db.blogPost.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error updating blog post:", error);
    return NextResponse.json(
      { error: "Failed to update blog post" },
      { status: 500 }
    );
  }
}

// DELETE - Delete blog post (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db.blogPost.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 }
    );
  }
}
