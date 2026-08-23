import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PlaygroundDashboard } from "@/components/playground/playground-dashboard";

export const metadata = {
  title: "Playground | PMP Portal",
  description: "The creative rooms PMP is running for you.",
};

/**
 * The client's playground rooms, inside the portal shell.
 *
 * Same dashboard as /playground, but under the portal sidebar so a client stays
 * in the portal instead of being dropped into a bare page. Which rooms appear is
 * decided server-side by roomListWhere() (src/lib/playground/repo.ts) — a CLIENT
 * sees only rooms assigned to them or ones they were invited to — so this page
 * decides "are you signed in", not "which rooms exist".
 *
 * Rooms themselves stay at /playground/[roomId]: a room is edge-to-edge and owns
 * the whole viewport, which is why it renders outside this shell.
 */
export default async function PortalPlaygroundPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/portal/login?callbackUrl=/portal/playground");
  }

  return <PlaygroundDashboard />;
}
