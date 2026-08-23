import { RoomShell } from "@/components/playground/room-shell";

export const metadata = {
  title: "PMP Playground",
};

export default async function PlaygroundRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <RoomShell roomId={roomId} />;
}
