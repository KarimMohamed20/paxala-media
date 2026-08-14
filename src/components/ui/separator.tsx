import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Hairline rule matching the app's `border-white/10` surface treatment.
 *
 * `decorative` (the default) renders it aria-hidden, which is right for the vast
 * majority of uses — a divider between toolbar groups conveys nothing to a
 * screen reader. Pass `decorative={false}` only when the rule genuinely marks a
 * semantic boundary between sections.
 */
export function Separator({
  orientation = "horizontal",
  decorative = true,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-hidden={decorative || undefined}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-white/10",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  );
}
