import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Services",
  description:
    "Video production, photography, drone & FPV cinematography, graphic design, 3D modeling, web & app development, and social media management — full-service creative production in Sakhnin.",
  path: "/services",
});

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
