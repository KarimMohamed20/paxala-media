"use client";

/**
 * Historical name for the shared avatar primitive.
 *
 * The initials logic lives in components/ui/avatar.tsx now that more than the
 * Monthly Plan needs it. Kept as a re-export so the existing Monthly Plan call
 * sites keep working unchanged.
 */
import { Avatar, type AvatarProps } from "@/components/ui/avatar";

export type PlanAvatarProps = Omit<AvatarProps, "status">;

export function PlanAvatar(props: PlanAvatarProps) {
  return <Avatar {...props} />;
}
