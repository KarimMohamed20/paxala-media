import type { Session } from "next-auth";
import { db } from "@/lib/db";

/**
 * Fetch the minimal project fields needed for an ownership check.
 * Returns null if the project does not exist.
 */
export async function getProjectForAccess(projectId: string) {
  return db.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true },
  });
}

/**
 * Authorization rule for project-scoped resources (files, milestones, tasks…).
 *
 * ADMIN and STAFF may access any project; a CLIENT may access only the project
 * they own (project.clientId === their user id). This mirrors the ACL already
 * used by the invoice-download route and closes the IDOR where any authenticated
 * user could read another client's project files.
 */
export function canAccessProject(
  session: Session | null,
  project: { clientId: string | null }
): boolean {
  if (!session?.user?.id) return false;
  const role = session.user.role;
  if (role === "ADMIN" || role === "STAFF") return true;
  return !!project.clientId && project.clientId === session.user.id;
}
