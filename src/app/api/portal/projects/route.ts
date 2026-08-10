import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Default fallback images for categories if project thumbnail is empty
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

// GET projects for the current user (client portal)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Admin sees all projects, clients see only their own
    const where = userRole === "ADMIN" ? {} : { clientId: userId };

    const rawProjects = await db.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
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
    });

    // Format projects and compute dynamic properties
    const formattedProjects = rawProjects.map((proj) => {
      // Calculate progress based on tasks
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

      // Determine current phase
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

      // Find next milestone
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

      // Determine if action is required by client
      const hasSubmittedTask = proj.milestones.some((m) =>
        m.tasks.some((t) => t.status === "SUBMITTED")
      );
      const actionRequired = proj.status === "REVIEW" || hasSubmittedTask;

      // Image thumbnail
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

    // Summary stats
    const activeProjectsCount = formattedProjects.filter((p) => p.status !== "COMPLETED" && p.status !== "ARCHIVED").length;
    const awaitingClientCount = formattedProjects.filter((p) => p.actionRequired || p.status === "REVIEW").length;
    const completedProjectsCount = formattedProjects.filter((p) => p.status === "COMPLETED").length;

    // Upcoming Milestones across all projects
    const allUpcomingMilestones: Array<{
      id: string;
      title: string;
      deadline: Date | null;
      projectTitle: string;
      projectSlug: string;
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
          });
        }
      });
    });

    allUpcomingMilestones.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    // Pending Client Actions
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
              title: `Approve ${t.title}`,
              dueDate: t.dueDate || proj.deadline,
              projectTitle: proj.title,
              projectSlug: proj.slug,
              type: "task_approval",
              actionUrl: `/portal/projects/${proj.slug}`,
            });
          }
        });
      });

      if (proj.status === "REVIEW") {
        clientActions.push({
          id: `review-${proj.id}`,
          title: `Review ${proj.title} Deliverables`,
          dueDate: proj.deadline,
          projectTitle: proj.title,
          projectSlug: proj.slug,
          type: "project_review",
          actionUrl: `/portal/projects/${proj.slug}`,
        });
      }
    });

    // Recent activity feed
    const recentActivity: Array<{
      id: string;
      type: "upload" | "comment" | "milestone";
      message: string;
      timestamp: Date;
      projectSlug: string;
    }> = [];

    rawProjects.forEach((proj) => {
      proj.comments.forEach((c) => {
        recentActivity.push({
          id: `comment-${c.id}`,
          type: "comment",
          message: `${c.user.name || "Team member"} commented on "${proj.title}"`,
          timestamp: c.createdAt,
          projectSlug: proj.slug,
        });
      });

      proj.files.forEach((f) => {
        recentActivity.push({
          id: `file-${f.id}`,
          type: "upload",
          message: `Uploaded file for "${proj.title}"`,
          timestamp: f.createdAt,
          projectSlug: proj.slug,
        });
      });
    });

    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      projects: formattedProjects,
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
  } catch (error) {
    console.error("Fetch client projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST create a new project request (Client Portal)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, deadline } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: "Title, description, and category are required" },
        { status: 400 }
      );
    }

    // Generate unique slug
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Create project
    const newProject = await db.project.create({
      data: {
        title,
        slug,
        description,
        category,
        status: "DRAFT",
        clientId: session.user.id,
        deadline: deadline ? new Date(deadline) : null,
        milestones: {
          create: [
            {
              title: "Project Initiation & Kickoff",
              description: "Initial scoping and requirements gathering.",
              order: 1,
            },
          ],
        },
      },
    });

    return NextResponse.json(
      { message: "Project request submitted successfully", project: newProject },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create project request error:", error);
    return NextResponse.json(
      { error: "Failed to create project request" },
      { status: 500 }
    );
  }
}


