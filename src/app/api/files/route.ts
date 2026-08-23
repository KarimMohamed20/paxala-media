import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessProject } from "@/lib/authz";
import { resolveAssetScope } from "@/lib/asset-scope";
import { deleteUpload, uploadFile } from "@/lib/storage";
import {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  DEFAULT_FOLDER_NAME,
  MAX_UPLOAD_BYTES,
  formatBytes,
} from "@/lib/assets";
import { format } from "date-fns";

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

const VIDEO_PLACEHOLDER_THUMBNAIL =
  "https://images.unsplash.com/photo-1579165466741-7f35e4755660?q=80&w=800&auto=format&fit=crop";

type SerializableFile = Prisma.ProjectFileGetPayload<{
  include: { project: { select: { id: true; title: true; slug: true } } };
}>;

/**
 * The single asset shape the Asset Library consumes. GET and PATCH both return
 * it, so an edited card renders identically to a freshly fetched one.
 */
function serializeAsset(file: SerializableFile) {
  return {
    id: file.id,
    name: file.name,
    url: file.url,
    type: file.type,
    category: file.category || "Video",
    // Both folder fields ship to the client: the Asset Library filters on
    // `folderId` when set and falls back to the legacy `folder` name.
    folder: file.folder || DEFAULT_FOLDER_NAME,
    folderId: file.folderId,
    description: file.description,
    isShared: file.isShared,
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
      (file.type === "image" ? file.url : VIDEO_PLACEHOLDER_THUMBNAIL),
    uploader: file.uploader || "PMP Creative Team",
    resolution: file.resolution || "4K MP4",
    usageRights: file.usageRights || "Approved for web and social.",
    availableFormats: file.formats || [
      {
        name: "Original Master",
        resolution: file.resolution || "Master File",
        size: formatBytes(file.size || 0),
      },
    ],
    versionHistory: file.versionHistory || [
      {
        version: file.version || "V1 Final",
        date: format(new Date(file.createdAt), "dd MMM yyyy"),
        status: "Current",
      },
    ],
  };
}

/**
 * Resolve a folder name to a real Folder row, so uploads and edits populate
 * `folderId` instead of only the legacy `folder` string. Returns null when no
 * folder row carries that name (the name is still stored on the file).
 */
async function resolveFolderId(
  folderName: string | null,
  projectId: string,
  ownerClientId: string | null
): Promise<string | null> {
  if (!folderName) return null;
  const candidates = await db.folder.findMany({
    where: {
      name: folderName,
      OR: [{ projectId }, { projectId: null }],
      // Never adopt a folder owned by a different client just because the name
      // matches — agency-wide folders (clientId null) are fair game for all.
      AND: [{ OR: [{ clientId: null }, { clientId: ownerClientId }] }],
    },
    select: { id: true, projectId: true },
  });
  // Prefer a folder scoped to this project over a global one of the same name.
  const scoped = candidates.find((f) => f.projectId === projectId);
  return (scoped ?? candidates[0])?.id ?? null;
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

    // Agency users may narrow the library to one client; a CLIENT is always
    // pinned to their own projects regardless of what they send.
    const scoped = await resolveAssetScope(session, searchParams.get("clientId"));
    if (!scoped.ok) {
      return NextResponse.json({ error: scoped.error }, { status: scoped.status });
    }
    const { projects, projectIds, clients, clientId, isStaff } = scoped.scope;

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

    type DerivedFolder = {
      name: string;
      filesCount: number;
      updatedDate: string;
      shared: boolean;
      latestTime: number;
    };

    const folderMap = dbFiles.reduce((acc, file) => {
      const folderName = file.folder || DEFAULT_FOLDER_NAME;
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
    }, {} as Record<string, DerivedFolder>);

    const folders = Object.values(folderMap);

    const assets = dbFiles.map(serializeAsset);

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
      // Drives the agency-side client switcher; empty for a CLIENT session.
      clients,
      clientId,
      isStaff,
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
    const customFolderId = formData.get("folderId") as string | null;

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

    const timestamp = Date.now();
    const originalName = file.name;
    const safeName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_");
    const filename = `${timestamp}-${safeName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const stored = await uploadFile(buffer, {
      mime: file.type,
      size: file.size,
      cloudFolder: `paxala/${projectId}`,
      localDir: projectId,
      localName: filename,
    });

    const mimeType = file.type;
    let fileType = "other";
    let category = "Design";
    let folder = DEFAULT_FOLDER_NAME;

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

    // Link the upload to a real Folder row when one exists, so folder cards
    // report accurate counts and folder filtering survives a rename.
    let folderId: string | null = null;
    if (customFolderId) {
      const target = await db.folder.findUnique({
        where: { id: customFolderId },
        select: { id: true, name: true, projectId: true, clientId: true },
      });
      const projectMatches =
        target && (target.projectId === null || target.projectId === projectId);
      const clientMatches =
        target && (target.clientId === null || target.clientId === project.clientId);
      if (target && projectMatches && clientMatches) {
        folderId = target.id;
        folder = target.name;
      }
    }
    if (!folderId) {
      folderId = await resolveFolderId(folder, projectId, project.clientId);
    }

    const fileRecord = await db.projectFile.create({
      data: {
        name: originalName,
        url: stored.url,
        storagePublicId: stored.publicId,
        storageResourceType: stored.resourceType,
        type: fileType,
        size: file.size,
        category,
        folder,
        folderId,
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

// PATCH — edit asset metadata (rename, recategorise, move between folders,
// change status/version, update usage rights, toggle sharing).
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    const file = await db.projectFile.findUnique({
      where: { id },
      select: {
        id: true,
        projectId: true,
        folder: true,
        folderId: true,
        version: true,
        versionHistory: true,
        project: { select: { clientId: true } },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!canAccessProject(session, file.project)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isStaff = session.user.role === "ADMIN" || session.user.role === "STAFF";

    // Approval state and usage rights carry contractual meaning, so only the
    // agency side may change them — a client can still organise and rename.
    if (!isStaff && (updates.status !== undefined || updates.usageRights !== undefined)) {
      return NextResponse.json(
        { error: "Only the PMP team can change approval status or usage rights." },
        { status: 403 }
      );
    }

    const data: Record<string, unknown> = {};

    if (typeof updates.name === "string") {
      const name = updates.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      data.name = name;
    }

    if (typeof updates.description === "string" || updates.description === null) {
      data.description = updates.description ? String(updates.description).trim() : null;
    }

    if (typeof updates.category === "string") {
      if (!ASSET_CATEGORIES.includes(updates.category as (typeof ASSET_CATEGORIES)[number])) {
        return NextResponse.json(
          { error: `Unknown category "${updates.category}".` },
          { status: 400 }
        );
      }
      data.category = updates.category;
    }

    if (typeof updates.status === "string") {
      if (!ASSET_STATUSES.includes(updates.status as (typeof ASSET_STATUSES)[number])) {
        return NextResponse.json(
          { error: `Unknown status "${updates.status}".` },
          { status: 400 }
        );
      }
      data.status = updates.status;
    }

    if (typeof updates.version === "string" && updates.version.trim()) {
      data.version = updates.version.trim();
    }

    if (typeof updates.usageRights === "string") {
      data.usageRights = updates.usageRights.trim() || null;
    }

    if (typeof updates.resolution === "string") {
      data.resolution = updates.resolution.trim() || null;
    }

    if (typeof updates.duration === "string" || updates.duration === null) {
      data.duration = updates.duration ? String(updates.duration).trim() : null;
    }

    if (typeof updates.isShared === "boolean") {
      data.isShared = updates.isShared;
    }

    // Folder move. `folderId` wins when supplied; otherwise a bare folder name
    // is resolved to a row so the two stay in sync.
    if (updates.folderId !== undefined) {
      if (updates.folderId === null || updates.folderId === "") {
        data.folderId = null;
        data.folder =
          typeof updates.folder === "string" && updates.folder.trim()
            ? updates.folder.trim()
            : DEFAULT_FOLDER_NAME;
      } else {
        const target = await db.folder.findUnique({
          where: { id: String(updates.folderId) },
          select: { id: true, name: true, projectId: true, clientId: true },
        });
        if (!target) {
          return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }
        if (target.projectId !== null && target.projectId !== file.projectId) {
          return NextResponse.json(
            { error: "That folder belongs to another project." },
            { status: 400 }
          );
        }
        // Blocks filing an asset into a folder owned by a different client,
        // which would make it visible in that client's library.
        if (target.clientId !== null && target.clientId !== file.project.clientId) {
          return NextResponse.json(
            { error: "That folder belongs to another client." },
            { status: 403 }
          );
        }
        data.folderId = target.id;
        data.folder = target.name;
      }
    } else if (typeof updates.folder === "string") {
      const folderName = updates.folder.trim() || DEFAULT_FOLDER_NAME;
      data.folder = folderName;
      data.folderId = await resolveFolderId(
        folderName,
        file.projectId,
        file.project.clientId
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
    }

    // A version bump is worth a history entry — the drawer renders this trail.
    if (typeof data.version === "string" && data.version !== file.version) {
      const history = Array.isArray(file.versionHistory)
        ? (file.versionHistory as Array<Record<string, unknown>>)
        : [];
      data.versionHistory = [
        { version: data.version, date: format(new Date(), "dd MMM yyyy"), status: "Current" },
        ...history.map((entry) =>
          entry?.status === "Current" ? { ...entry, status: "Superseded" } : entry
        ),
      ];
    }

    const updated = await db.projectFile.update({
      where: { id },
      data,
      include: { project: { select: { id: true, title: true, slug: true } } },
    });

    return NextResponse.json({
      message: "File updated successfully",
      file: serializeAsset(updated),
    });
  } catch (error) {
    console.error("Update file error:", error);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
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
      include: { project: { select: { clientId: true } } },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!canAccessProject(session, file.project)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.projectFile.delete({
      where: { id: fileId },
    });

    await deleteUpload({
      publicId: file.storagePublicId,
      resourceType: file.storageResourceType,
      url: file.url,
    });

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
