import { SessionSummary } from "@/components/playground/session-summary";

export const metadata = { title: "Session summary — PMP Playground" };

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <SessionSummary roomId={roomId} />;
}
