import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessProject, getProjectBySlugForAccess } from "@/lib/authz";
import { PlaygroundDashboard } from "@/components/playground/playground-dashboard";

/**
 * Playground rooms for one project.
 *
 * Reuses the project ACL already used by every other project-scoped route
 * (getProjectBySlugForAccess + canAccessProject in @/lib/authz) rather than
 * inventing a second rule. The room list itself is fetched client-side and is
 * separately scoped server-side by roomListWhere(), so this page decides
 * "may you see this project", not "which rooms exist".
 */
export default async function ProjectPlaygroundPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/portal/login?callbackUrl=/portal/projects/${slug}/playground`);
  }

  const project = await getProjectBySlugForAccess(slug);
  if (!project) notFound();
  if (!canAccessProject(session, project)) notFound();

  return (
    <PlaygroundDashboard projectFilterId={project.id} projectTitle={project.title} />
  );
}
