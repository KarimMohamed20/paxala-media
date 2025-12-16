import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-red-600 text-white",
        secondary: "bg-white/10 text-white border border-white/20",
        outline: "border border-red-600 text-red-600",
        success: "bg-green-600/20 text-green-400 border border-green-600/30",
        warning: "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30",
        destructive: "bg-red-600/20 text-red-400 border border-red-600/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
