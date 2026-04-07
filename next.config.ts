import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: { buildActivity: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Performance optimizations
  reactStrictMode: true,
  
  // Reduce dev server startup time
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      // Reduce source maps in dev mode
      config.devtool = false;
      
      // Exclude some files from watching
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules', '**/.git', '**/*.log'],
      };
    }
    return config;
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'xlsx', 'jspdf'],
    optimizeCss: true,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
};

export default nextConfig;
