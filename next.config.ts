import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Image optimization settings
  images: {
    // Restrict the image optimizer to our own domains (was hostname "**", an
    // open image-proxy / SSRF surface — DEP-05). Add a host here if you serve
    // images from a CDN.
    remotePatterns: [
      { protocol: "https", hostname: "paxaland.com" },
      { protocol: "https", hostname: "www.paxaland.com" },
      { protocol: "https", hostname: "paxalamedia.com" },
      { protocol: "https", hostname: "www.paxalamedia.com" },
      { protocol: "http", hostname: "localhost" },
      // Demo/seed media only. api/dashboard and api/portal/projects already emit
      // Unsplash placeholder URLs, so these were broken images in production.
      // Remove both once real client media replaces the seeded assets.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "commondatastorage.googleapis.com" },
    ],
    // Disable optimization for local development to avoid private IP error
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ["lucide-react", "framer-motion"],

    // Body size cap for Server Actions and Route Handlers. Kept just above the
    // 500MB upload cap rather than 1GB to limit memory-exhaustion risk (DEP-06).
    serverActions: {
      bodySizeLimit: "550mb",
    },
  },
};

export default withNextIntl(nextConfig);
