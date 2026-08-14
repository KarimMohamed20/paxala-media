import type { PlaygroundRoomStatus, Role, RoomMemberRole } from "@prisma/client";

/**
 * Wire shapes for the Playground client components.
 *
 * Declared by hand rather than derived from the Prisma payload types because
 * these cross an HTTP boundary: dates arrive as ISO strings, not Date objects,
 * and pretending otherwise is how `.toISOString()` ends up being called on a
 * string at runtime.
 */

export type RoomPerson = {
  id: string;
  name: string | null;
  image?: string | null;
  jobTitle?: string | null;
  role?: Role;
};

export type RoomMemberData = {
  role: RoomMemberRole;
  lastSeenAt?: string | null;
  user: RoomPerson;
};

export type RoomCardData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: PlaygroundRoomStatus;
  restricted: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  client: { id: string; name: string | null; username: string } | null;
  project: { id: string; title: string; slug: string } | null;
  members: RoomMemberData[];
  _count: { members: number; nodes: number };
  /** Derived server-side: the room has an approval request pending. */
  awaitingClient: boolean;
};

export type ClientOption = {
  id: string;
  name: string | null;
  username: string;
};

export type ProjectOption = {
  id: string;
  title: string;
  slug: string;
  clientId: string | null;
};

export type RoomViewer = {
  userId: string;
  role: Role;
  effectiveRole: RoomMemberRole;
  mode: "STUDIO" | "CLIENT";
  isStaff: boolean;
  can: {
    edit: boolean;
    comment: boolean;
    vote: boolean;
    publish: boolean;
    requestApproval: boolean;
    approve: boolean;
    manage: boolean;
    useAi: boolean;
  };
};

export type RoomDetailData = RoomCardData & {
  opSeq?: number;
  camera?: { x: number; y: number; z: number } | null;
};
