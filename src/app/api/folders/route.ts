import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";

// GET folders for authenticated user / client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const projectsWhere = userRole === "ADMIN"
      ? (projectId ? { id: projectId } : {})
      : (projectId ? { id: projectId, clientId: userId } : { clientId: userId });

    const projects = await db.project.findMany({
      where: projectsWhere,
      select: { id: true },
    });

    const projectIds = projects.map((p) => p.id);

    // Find all folders linked to these projects or global folders
    const folders = await db.folder.findMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          { projectId: null },
        ],
      },
      include: {
        files: {
          select: {
            id: true,
            size: true,
            createdAt: true,
            isShared: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedFolders = folders.map((f) => {
      const filesCount = f.files.length;
      const hasShared = f.isShared || f.files.some((file) => file.isShared);
      const latestFileTime = f.files.reduce(
        (max, file) => Math.max(max, new Date(file.createdAt).getTime()),
        new Date(f.updatedAt).getTime()
      );
      const updatedDate = `Updated ${format(new Date(latestFileTime), "dd MMM yyyy")}`;

      return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        description: f.description,
        color: f.color || "red",
        filesCount,
        updatedDate,
        shared: hasShared,
        projectId: f.projectId,
        createdAt: f.createdAt.toISOString(),
      };
    });

    return NextResponse.json(formattedFolders);
  } catch (error) {
    console.error("Fetch folders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}

// POST create folder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, isShared, projectId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Generate unique slug
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug) baseSlug = "folder";

    let slug = baseSlug;
    let counter = 1;
    while (await db.folder.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newFolder = await db.folder.create({
      data: {
        name,
        slug,
        description: description || null,
        color: color || "red",
        isShared: Boolean(isShared),
        projectId: projectId || null,
      },
    });

    return NextResponse.json(
      {
        message: "Folder created successfully",
        folder: {
          id: newFolder.id,
          name: newFolder.name,
          slug: newFolder.slug,
          description: newFolder.description,
          color: newFolder.color,
          filesCount: 0,
          updatedDate: `Updated ${format(new Date(newFolder.createdAt), "dd MMM yyyy")}`,
          shared: newFolder.isShared,
          projectId: newFolder.projectId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create folder error:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}

// DELETE folder
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("id");

    if (!folderId) {
      return NextResponse.json(
        { error: "Folder ID is required" },
        { status: 400 }
      );
    }

    const folder = await db.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await db.folder.delete({
      where: { id: folderId },
    });

    return NextResponse.json({ message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Delete folder error:", error);
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 }
    );
  }
}
