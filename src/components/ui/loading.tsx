"use client";

import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loading({ className, size = "md" }: LoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-white/20 border-t-red-500",
          sizeClasses[size]
        )}
      />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        <Loading size="lg" />
        <p className="mt-4 text-white/60 text-sm">Loading...</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 animate-pulse">
      <div className="h-48 bg-white/10 rounded-lg mb-4" />
      <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
      <div className="h-4 bg-white/10 rounded w-1/2" />
    </div>
  );
}
