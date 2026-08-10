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
      if (status) {
        where.status = status;
      }

      const defaultCategoryImages: Record<string, string> = {
        VIDEO_PRODUCTION: "https://images.unsplash.com/photo-1579165466741-7f35e4755660?q=80&w=1000&auto=format&fit=crop",
        PHOTOGRAPHY: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1000&auto=format&fit=crop",
        GRAPHIC_DESIGN: "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1000&auto=format&fit=crop",
        WEB_DEVELOPMENT: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop",
        APP_DEVELOPMENT: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1000&auto=format&fit=crop",
        THREE_D_MODELING: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
        ANIMATION: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop",
        SOCIAL_MEDIA: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop",
      };

      const [rawProjects, total] = await Promise.all([
        db.project.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            staff: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
            milestones: {
              orderBy: { order: "asc" },
              include: {
                tasks: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    dueDate: true,
                  },
                },
              },
            },
            files: {
              take: 5,
              orderBy: { createdAt: "desc" },
            },
            comments: {
              take: 5,
              orderBy: { createdAt: "desc" },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
            _count: {
              select: {
                files: true,
                comments: true,
                milestones: true,
              },
            },
          },
        }),
        db.project.count({ where }),
      ]);

      const formattedProjects = rawProjects.map((proj) => {
        let totalTasks = 0;
        let completedTasks = 0;
        proj.milestones.forEach((m) => {
          m.tasks.forEach((t) => {
            totalTasks++;
            if (t.status === "APPROVED") completedTasks++;
          });
        });

        let progress = 0;
        if (totalTasks > 0) {
          progress = Math.round((completedTasks / totalTasks) * 100);
        } else {
          const statusMap: Record<string, number> = {
            DRAFT: 10,
            IN_PROGRESS: 45,
            REVIEW: 85,
            COMPLETED: 100,
            ARCHIVED: 100,
          };
          progress = statusMap[proj.status] || 0;
        }

        let currentPhase = "Planning";
        if (proj.status === "COMPLETED") {
          currentPhase = "Completed";
        } else if (proj.status === "REVIEW") {
          currentPhase = "Client Approval";
        } else {
          const activeMilestone = proj.milestones.find((m) =>
            m.tasks.some((t) => t.status !== "APPROVED")
          );
          if (activeMilestone) {
            currentPhase = activeMilestone.title;
          } else if (proj.category === "VIDEO_PRODUCTION" || proj.category === "ANIMATION") {
            currentPhase = "Post-production";
          } else if (proj.category === "WEB_DEVELOPMENT" || proj.category === "APP_DEVELOPMENT") {
            currentPhase = "UI Development";
          } else if (proj.category === "PHOTOGRAPHY") {
            currentPhase = "Shot List & Styling";
          }
        }

        const now = new Date();
        const upcomingMs = proj.milestones.find(
          (m) => m.deadline && new Date(m.deadline) >= now
        ) || proj.milestones[0];

        const nextMilestone = upcomingMs
          ? {
              id: upcomingMs.id,
              title: upcomingMs.title,
              deadline: upcomingMs.deadline,
            }
          : null;

        const hasSubmittedTask = proj.milestones.some((m) =>
          m.tasks.some((t) => t.status === "SUBMITTED")
        );
        const actionRequired = proj.status === "REVIEW" || hasSubmittedTask;
        const thumbnail = proj.thumbnail || defaultCategoryImages[proj.category] || defaultCategoryImages.VIDEO_PRODUCTION;

        return {
          id: proj.id,
          title: proj.title,
          slug: proj.slug,
          description: proj.description,
          category: proj.category,
          status: proj.status,
          thumbnail,
          images: proj.images,
          deadline: proj.deadline || proj.endDate,
          clientName: proj.clientName || proj.client?.name || proj.client?.email || null,
          clientId: proj.clientId,
          featured: proj.featured,
          createdAt: proj.createdAt,
          updatedAt: proj.updatedAt,
          progress,
          currentPhase,
          nextMilestone,
          actionRequired,
          staff: proj.staff,
          _count: proj._count,
        };
      });

      // Compute Stats for Admin
      const activeProjectsCount = formattedProjects.filter((p) => p.status !== "COMPLETED" && p.status !== "ARCHIVED").length;
      const awaitingClientCount = formattedProjects.filter((p) => p.actionRequired || p.status === "REVIEW").length;
      const completedProjectsCount = formattedProjects.filter((p) => p.status === "COMPLETED").length;

      // Upcoming Milestones
      const allUpcomingMilestones: Array<{
        id: string;
        title: string;
        deadline: Date | null;
        projectTitle: string;
        projectSlug: string;
        projectId: string;
      }> = [];

      rawProjects.forEach((proj) => {
        proj.milestones.forEach((m) => {
          if (m.deadline && proj.status !== "COMPLETED") {
            allUpcomingMilestones.push({
              id: m.id,
              title: m.title,
              deadline: m.deadline,
              projectTitle: proj.title,
              projectSlug: proj.slug,
              projectId: proj.id,
            });
          }
        });
      });

      allUpcomingMilestones.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

      // Pending Client Actions / Submissions
      const clientActions: Array<{
        id: string;
        title: string;
        dueDate: Date | null;
        projectTitle: string;
        projectSlug: string;
        type: string;
        actionUrl: string;
      }> = [];

      rawProjects.forEach((proj) => {
        proj.milestones.forEach((m) => {
          m.tasks.forEach((t) => {
            if (t.status === "SUBMITTED") {
              clientActions.push({
                id: t.id,
                title: `Task Approval Required: ${t.title}`,
                dueDate: t.dueDate || proj.deadline,
                projectTitle: proj.title,
                projectSlug: proj.slug,
                type: "task_approval",
                actionUrl: `/admin/projects/${proj.id}`,
              });
            }
          });
        });

        if (proj.status === "REVIEW") {
          clientActions.push({
            id: `review-${proj.id}`,
            title: `Client Review Pending: ${proj.title}`,
            dueDate: proj.deadline,
            projectTitle: proj.title,
            projectSlug: proj.slug,
            type: "project_review",
            actionUrl: `/admin/projects/${proj.id}`,
          });
        }
      });

      // Recent activity
      const recentActivity: Array<{
        id: string;
        type: "upload" | "comment" | "milestone";
        message: string;
        timestamp: Date;
        projectId: string;
      }> = [];

      rawProjects.forEach((proj) => {
        proj.comments.forEach((c) => {
          recentActivity.push({
            id: `comment-${c.id}`,
            type: "comment",
            message: `${c.user.name || "User"} commented on "${proj.title}"`,
            timestamp: c.createdAt,
            projectId: proj.id,
          });
        });

        proj.files.forEach((f) => {
          recentActivity.push({
            id: `file-${f.id}`,
            type: "upload",
            message: `Uploaded file "${f.name}" to ${proj.title}`,
            timestamp: f.createdAt,
            projectId: proj.id,
          });
        });
      });

      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return NextResponse.json({
        projects: formattedProjects,
        total,
        hasMore: offset + limit < total,
        stats: {
          activeProjects: activeProjectsCount,
          awaitingClient: awaitingClientCount,
          upcomingMilestones: allUpcomingMilestones.length,
          completedProjects: completedProjectsCount,
        },
        upcomingMilestones: allUpcomingMilestones.slice(0, 5),
        clientActions: clientActions.slice(0, 5),
        recentActivity: recentActivity.slice(0, 5),
      });
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
