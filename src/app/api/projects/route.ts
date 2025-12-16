import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const status = searchParams.get("status");
    const admin = searchParams.get("admin");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};

    // For admin requests, check authentication and show all projects
    if (admin === "true") {
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Admin can filter by status
      if (status) {
        where.status = status;
      }
    } else {
      // Public portfolio: only completed and published projects
      where.status = "COMPLETED";
      where.publishedAt = { not: null };
    }

    if (category && category !== "all") {
      where.category = category;
    }

    if (featured === "true") {
      where.featured = true;
    }

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        orderBy: admin === "true" ? { createdAt: "desc" } : { publishedAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnail: true,
          images: true,
          videoUrl: true,
          category: true,
          tags: true,
          clientName: true,
          featured: true,
          publishedAt: true,
          status: true,
          createdAt: true,
        },
      }),
      db.project.count({ where }),
    ]);

    return NextResponse.json({
      projects,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Fetch projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// Protected route for creating projects (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      slug,
      description,
      content,
      thumbnail,
      images,
      videoUrl,
      category,
      tags,
      clientName,
      clientId,
      serviceId,
      featured,
    } = body;

    // Validate required fields
    if (!title || !slug || !description || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for existing slug
    const existingProject = await db.project.findUnique({
      where: { slug },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: "A project with this slug already exists" },
        { status: 409 }
      );
    }

    const project = await db.project.create({
      data: {
        title,
        slug,
        description,
        content,
        thumbnail,
        images: images || [],
        videoUrl,
        category,
        tags: tags || [],
        clientName,
        clientId,
        serviceId,
        featured: featured || false,
      },
    });

    return NextResponse.json(
      { message: "Project created successfully", project },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
