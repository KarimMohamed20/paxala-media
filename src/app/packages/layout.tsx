import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Packages",
  description:
    "Brand 360° monthly retainers — reels, photography, drone, design, and paid Meta ads management, with optional website and app development. One studio for your whole digital presence.",
  path: "/packages",
});

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
