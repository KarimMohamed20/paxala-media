import { ApprovalDeck } from "@/components/playground/approval-deck";

export const metadata = {
  title: "Review — PMP Playground",
};

/**
 * The client's review surface.
 *
 * A route of its own rather than a panel inside the room, because this is the
 * one Playground screen a client is most likely to open on a phone, from an
 * email, with no intention of exploring a canvas. It reads the FROZEN approval
 * payload and needs neither the canvas engine nor the live stream — which is
 * also what makes it work when the connection is poor, and on mobile Safari,
 * where a backgrounded tab's stream is unreliable by nature.
 */
export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ roomId: string; approvalId: string }>;
}) {
  const { roomId, approvalId } = await params;
  return <ApprovalDeck roomId={roomId} approvalId={approvalId} />;
}
