import type { Session } from "next-auth";
import { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getActor } from "@/lib/content-authz";

/**
 * Who the Asset Library is being read as.
 *
 * The library is client-owned data reached through `Project.clientId`, so both
 * /api/files and /api/folders must scope every read the same way — otherwise
 * folder counts and asset lists disagree. This is the one place that decides:
 *
 *   CLIENT      -> their own projects, always. A `clientId` parameter is ignored,
 *                  never trusted, so a client can never read another's library.
 *   ADMIN/STAFF -> every client by default, or one client when `clientId` names
 *                  a real CLIENT user (the agency-side switcher).
 *
 * Mirrors the actor/target split already used by the content calendar
 * (see resolveTargetClientId in @/lib/content-authz), but defaults staff to
 * "all clients" rather than one — a library is browsed across clients, whereas
 * a calendar is read one client at a time.
 */

export type AssetScopeClient = {
  id: string;
  name: string | null;
  username: string;
};

export type AssetScope = {
  /** Projects in scope — also drives the project filter in the UI. */
  projects: Array<{ id: string; title: string; slug: string }>;
  projectIds: string[];
  /** Clients offered in the agency switcher. Always empty for a CLIENT. */
  clients: AssetScopeClient[];
  /** The client being viewed; null means "all clients" (agency view). */
  clientId: string | null;
  isStaff: boolean;
};

export type AssetScopeResult =
  | { ok: true; scope: AssetScope }
  | { ok: false; status: 401 | 400; error: string };

export async function resolveAssetScope(
  session: Session | null,
  requestedClientId?: string | null
): Promise<AssetScopeResult> {
  const actor = getActor(session);
  if (!actor) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  // "all" is the explicit agency-wide value; treat a blank param the same way.
  const wantsAll =
    !requestedClientId || requestedClientId === "all" || requestedClientId === "";

  let clientId: string | null;
  let clients: AssetScopeClient[] = [];

  if (!actor.isStaff) {
    clientId = actor.userId;
  } else {
    clients = await db.user.findMany({
      where: { role: Role.CLIENT, projects: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, username: true },
    });

    if (wantsAll) {
      clientId = null;
    } else {
      const target = await db.user.findFirst({
        where: { id: requestedClientId!, role: Role.CLIENT },
        select: { id: true },
      });
      if (!target) {
        return { ok: false, status: 400, error: "Unknown client" };
      }
      clientId = target.id;
    }
  }

  const projects = await db.project.findMany({
    where: clientId ? { clientId } : {},
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true },
  });

  return {
    ok: true,
    scope: {
      projects,
      projectIds: projects.map((p) => p.id),
      clients,
      clientId,
      isStaff: actor.isStaff,
    },
  };
}

/**
 * Which folders a scope may see.
 *
 * `Folder.clientId` names the client whose library a folder belongs to; NULL
 * means agency-wide (the shipped defaults every client shares). A folder is
 * visible when it is agency-wide, owned by the client in scope, or scoped to a
 * project in scope.
 *
 * Without the `clientId` term, every project-less folder was returned to every
 * client — so one client's folder *names* showed up in another's library. See
 * migration 20260811000000_add_folder_client_owner.
 *
 * Staff viewing "all clients" (`scope.clientId === null` with `isStaff`) get
 * every folder; staff viewing one client see exactly what that client sees, so
 * the agency view is a faithful preview.
 */
export function folderVisibilityWhere(scope: AssetScope): Prisma.FolderWhereInput {
  if (scope.isStaff && scope.clientId === null) return {};

  return {
    OR: [
      { clientId: scope.clientId },
      { clientId: null, projectId: null },
      { projectId: { in: scope.projectIds } },
    ],
  };
}
