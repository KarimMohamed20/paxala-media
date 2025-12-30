import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ["lucide-react", "framer-motion"],

    // Increase body size limit to 1GB (for file uploads)
    // Note: This applies to Server Actions and Route Handlers
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
};

export default nextConfig;
