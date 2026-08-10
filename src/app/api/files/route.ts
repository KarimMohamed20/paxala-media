import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileUrl } from "@/lib/utils";
import { canAccessProject } from "@/lib/authz";
import { deleteLocalUpload } from "@/lib/storage";
import { format } from "date-fns";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB
const ALLOWED_UPLOAD_MIME = new Set<string>([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/avi",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-rar-compressed",
]);

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// GET files for a project or all accessible assets for the user directly from PostgreSQL DB
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const isGlobal = searchParams.get("global") === "true" || !projectId;

    const userRole = session.user.role;
    const userId = session.user.id;

    if (projectId && !isGlobal) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { clientId: true },
      });

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      if (!canAccessProject(session, project)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const files = await db.projectFile.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(files);
    }

    const projectsWhere = userRole === "ADMIN" ? {} : { clientId: userId };
    const projects = await db.project.findMany({
      where: projectsWhere,
      select: { id: true, title: true, slug: true },
    });

    const projectIds = projects.map((p) => p.id);

    const dbFiles = await db.projectFile.findMany({
      where: {
        projectId: { in: projectIds },
      },
      include: {
        project: {
          select: { id: true, title: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalAssets = dbFiles.length;
    const totalStorageBytes = dbFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const sharedFilesCount = dbFiles.filter((f) => f.isShared).length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const addedThisMonthCount = dbFiles.filter(
      (f) => new Date(f.createdAt) >= startOfMonth
    ).length;

    const folderMap = dbFiles.reduce((acc, file) => {
      const folderName = file.folder || "General";
      if (!acc[folderName]) {
        acc[folderName] = {
          name: folderName,
          filesCount: 0,
          updatedDate: `Updated ${format(new Date(file.createdAt), "dd MMM yyyy")}`,
          shared: false,
          latestTime: new Date(file.createdAt).getTime(),
        };
      }
      acc[folderName].filesCount += 1;
      if (file.isShared) acc[folderName].shared = true;
      if (new Date(file.createdAt).getTime() > acc[folderName].latestTime) {
        acc[folderName].latestTime = new Date(file.createdAt).getTime();
        acc[folderName].updatedDate = `Updated ${format(new Date(file.createdAt), "dd MMM yyyy")}`;
      }
      return acc;
    }, {} as Record<string, any>);

    const folders = Object.values(folderMap);

    const assets = dbFiles.map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      type: file.type,
      category: file.category || "Video",
      size: file.size || 0,
      sizeFormatted: formatBytes(file.size || 0),
      projectId: file.projectId,
      projectTitle: file.project.title,
      projectSlug: file.project.slug,
      createdAt: file.createdAt.toISOString(),
      formattedDate: format(new Date(file.createdAt), "dd MMM yyyy"),
      version: file.version || "V1 Final",
      status: file.status || "Approved",
      duration: file.duration || null,
      thumbnail:
        file.thumbnail ||
        (file.type === "image"
          ? file.url
          : "https://images.unsplash.com/photo-1579165466741-7f35e4755660?q=80&w=800&auto=format&fit=crop"),
      uploader: file.uploader || "PMP Creative Team",
      resolution: file.resolution || "4K MP4",
      usageRights: file.usageRights || "Approved for web and social.",
      availableFormats: (file.formats as any) || [
        { name: "Original Master", resolution: file.resolution || "Master File", size: formatBytes(file.size || 0) },
      ],
      versionHistory: (file.versionHistory as any) || [
        { version: file.version || "V1 Final", date: format(new Date(file.createdAt), "dd MMM yyyy"), status: "Current" },
      ],
    }));

    return NextResponse.json({
      stats: {
        totalAssets,
        storageUsedFormatted: formatBytes(totalStorageBytes),
        storageCapacityFormatted: "150 GB",
        storageUsedBytes: totalStorageBytes,
        storageCapacityBytes: 150 * 1024 * 1024 * 1024,
        sharedFilesCount,
        addedThisMonthCount,
      },
      folders,
      projects,
      assets,
    });
  } catch (error) {
    console.error("Fetch files error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}

// POST upload file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const customCategory = formData.get("category") as string | null;
    const customFolder = formData.get("folder") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, clientId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!canAccessProject(session, project)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum allowed is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.` },
        { status: 413 }
      );
    }

    if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type "${file.type || "unknown"}".` },
        { status: 415 }
      );
    }

    const uploadDir = join(process.cwd(), "public", "uploads", projectId);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const originalName = file.name;
    const safeName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_");
    const filename = `${timestamp}-${safeName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const mimeType = file.type;
    let fileType = "other";
    let category = "Design";
    let folder = "General";

    if (mimeType.startsWith("image/")) {
      fileType = "image";
      category = "Photography";
      folder = "Photography";
    } else if (mimeType.startsWith("video/")) {
      fileType = "video";
      category = "Video";
      folder = "Video Masters";
    } else if (mimeType.startsWith("audio/")) {
      fileType = "audio";
      category = "Video";
      folder = "Video Masters";
    } else if (mimeType.includes("pdf")) {
      fileType = "pdf";
      category = "Documents";
      folder = "Documents";
    } else if (mimeType.includes("document") || mimeType.includes("text")) {
      fileType = "document";
      category = "Documents";
      folder = "Documents";
    }

    if (customCategory) category = customCategory;
    if (customFolder) folder = customFolder;

    const relativePath = `/uploads/${projectId}/${filename}`;
    const fullUrl = getFileUrl(relativePath);

    const fileRecord = await db.projectFile.create({
      data: {
        name: originalName,
        url: fullUrl,
        type: fileType,
        size: file.size,
        category,
        folder,
        version: "V1 Final",
        status: "Approved",
        uploader: session.user.name || "PMP Staff",
        resolution: fileType === "video" ? "4K MP4" : fileType === "image" ? "High Res Image" : "Document",
        usageRights: "Approved for web and social.",
        formats: [
          { name: "Original Upload", resolution: "Master File", size: formatBytes(file.size) },
        ],
        versionHistory: [
          { version: "V1 Final", date: format(new Date(), "dd MMM yyyy"), status: "Current" },
        ],
        projectId,
      },
    });

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        file: fileRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload file error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// DELETE file
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    const file = await db.projectFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await db.projectFile.delete({
      where: { id: fileId },
    });

    await deleteLocalUpload(file.url);

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
