import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { assetBelongsToFolder, DEFAULT_FOLDER_NAME } from "@/lib/assets";
import {
  folderVisibilityWhere,
  resolveAssetScope,
  type AssetScope,
} from "@/lib/asset-scope";
import { format } from "date-fns";

/**
 * A folder card as the Asset Library renders it. `id`/`slug` are null for
 * "virtual" folders — names that exist only as free text on legacy uploads and
 * have no `Folder` row behind them yet.
 */
type FolderCard = {
  id: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  color: string;
  filesCount: number;
  updatedDate: string;
  shared: boolean;
  projectId: string | null;
  virtual: boolean;
  createdAt: string;
};

/**
 * The scope every folder read and count is computed over.
 *
 * Delegates client scoping to resolveAssetScope so folder counts always match
 * the asset list /api/files returns for the same query, then narrows to a
 * single project when one was requested.
 */
async function folderScope(
  session: Session | null,
  projectId: string | null,
  requestedClientId?: string | null
): Promise<{ scope: AssetScope; projectIds: string[] } | null> {
  const scoped = await resolveAssetScope(session, requestedClientId);
  if (!scoped.ok) return null;

  const { scope } = scoped;
  const projectIds = !projectId
    ? scope.projectIds
    : scope.projectIds.includes(projectId)
    ? [projectId]
    : [];

  return { scope, projectIds };
}

// GET folders for authenticated user / client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const scoped = await folderScope(
      session,
      projectId,
      searchParams.get("clientId")
    );
    if (!scoped) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }
    const { scope, projectIds } = scoped;

    // Agency-wide folders, this client's own folders, and folders scoped to a
    // project in view — never another client's.
    const folders = await db.folder.findMany({
      where: folderVisibilityWhere(scope),
      orderBy: { updatedAt: "desc" },
    });

    // Counts are computed against every asset the caller can see, not just the
    // ones carrying a folderId — legacy uploads only have the folder *name*.
    const files = await db.projectFile.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        id: true,
        folder: true,
        folderId: true,
        isShared: true,
        createdAt: true,
      },
    });

    const formattedFolders: FolderCard[] = folders.map((f) => {
      const folderFiles = files.filter((file) =>
        assetBelongsToFolder(file, { id: f.id, name: f.name })
      );
      const hasShared = f.isShared || folderFiles.some((file) => file.isShared);
      const latestFileTime = folderFiles.reduce(
        (max, file) => Math.max(max, new Date(file.createdAt).getTime()),
        new Date(f.updatedAt).getTime()
      );

      return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        description: f.description,
        color: f.color || "red",
        filesCount: folderFiles.length,
        updatedDate: `Updated ${format(new Date(latestFileTime), "dd MMM yyyy")}`,
        shared: hasShared,
        projectId: f.projectId,
        virtual: false,
        createdAt: f.createdAt.toISOString(),
      };
    });

    // Folder names that exist only as free text on older uploads still need a
    // card, otherwise those assets become unreachable from the folder rail.
    const knownNames = new Set(folders.map((f) => f.name));
    const virtualFolders = new Map<
      string,
      { filesCount: number; shared: boolean; latestTime: number }
    >();

    for (const file of files) {
      if (file.folderId) continue;
      const name = file.folder || DEFAULT_FOLDER_NAME;
      if (knownNames.has(name)) continue;

      const entry = virtualFolders.get(name) ?? {
        filesCount: 0,
        shared: false,
        latestTime: 0,
      };
      entry.filesCount += 1;
      if (file.isShared) entry.shared = true;
      entry.latestTime = Math.max(entry.latestTime, new Date(file.createdAt).getTime());
      virtualFolders.set(name, entry);
    }

    for (const [name, entry] of virtualFolders) {
      formattedFolders.push({
        id: null,
        name,
        slug: null,
        description: null,
        color: "red",
        filesCount: entry.filesCount,
        updatedDate: `Updated ${format(new Date(entry.latestTime), "dd MMM yyyy")}`,
        shared: entry.shared,
        projectId: null,
        virtual: true,
        createdAt: new Date(entry.latestTime).toISOString(),
      });
    }

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
    const { name, description, color, isShared, projectId, clientId } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const folderName = name.trim();

    // Ownership is decided server-side. A CLIENT always owns what they create,
    // so their folder names stay out of every other client's library. Staff
    // create agency-wide folders unless they are viewing one client, in which
    // case the folder joins that client's library.
    const scoped = await folderScope(session, projectId || null, clientId);
    if (!scoped) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }
    const ownerClientId = scoped.scope.clientId;

    if (projectId && !scoped.projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate unique slug
    let baseSlug = folderName
      .toLowerCase()
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
        name: folderName,
        slug,
        description: description?.trim() || null,
        color: color || "red",
        isShared: Boolean(isShared),
        projectId: projectId || null,
        clientId: ownerClientId,
      },
    });

    // Adopt any existing assets that already carry this folder name, so a
    // freshly created folder isn't misleadingly empty.
    const adopted = await db.projectFile.updateMany({
      where: {
        projectId: { in: scoped.projectIds },
        folderId: null,
        folder: folderName,
      },
      data: { folderId: newFolder.id },
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
          filesCount: adopted.count,
          updatedDate: `Updated ${format(new Date(newFolder.createdAt), "dd MMM yyyy")}`,
          shared: newFolder.isShared,
          projectId: newFolder.projectId,
          virtual: false,
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

// PATCH rename / restyle a folder
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, color, isShared } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
    }

    const folder = await db.folder.findUnique({ where: { id } });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    if (!(await canMutateFolder(session, folder))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};

    if (typeof name === "string") {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "Folder name cannot be empty" },
          { status: 400 }
        );
      }
      data.name = trimmed;
    }
    if (typeof description === "string" || description === null) {
      data.description = description ? String(description).trim() : null;
    }
    if (typeof color === "string") data.color = color;
    if (typeof isShared === "boolean") data.isShared = isShared;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
    }

    const updated = await db.folder.update({ where: { id }, data });

    // Keep the denormalised folder name on member files in step with a rename.
    if (typeof data.name === "string" && data.name !== folder.name) {
      await db.projectFile.updateMany({
        where: { folderId: folder.id },
        data: { folder: data.name as string },
      });
    }

    return NextResponse.json({
      message: "Folder updated successfully",
      folder: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        color: updated.color,
        shared: updated.isShared,
        projectId: updated.projectId,
        virtual: false,
      },
    });
  } catch (error) {
    console.error("Update folder error:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
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

    if (!(await canMutateFolder(session, folder))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Deleting a folder must not delete its assets: return them to the default
    // folder first (the FK is SetNull, but the legacy name would otherwise
    // linger and resurrect the folder as a virtual card).
    await db.projectFile.updateMany({
      where: { folderId: folder.id },
      data: { folderId: null, folder: DEFAULT_FOLDER_NAME },
    });

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

/**
 * Who may rename or delete a folder: the agency team for any folder, a client
 * for folders they own or that are scoped to a project they own. Agency-wide
 * folders (no owner, no project) are shared infrastructure — staff only, so one
 * client cannot rename a folder every other client sees.
 */
async function canMutateFolder(
  session: { user: { id: string; role?: string } },
  folder: { projectId: string | null; clientId: string | null }
): Promise<boolean> {
  const role = session.user.role;
  if (role === "ADMIN" || role === "STAFF") return true;
  if (folder.clientId && folder.clientId === session.user.id) return true;
  if (!folder.projectId) return false;

  const project = await db.project.findUnique({
    where: { id: folder.projectId },
    select: { clientId: true },
  });

  return !!project && project.clientId === session.user.id;
}
