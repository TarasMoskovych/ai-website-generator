import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Mark packages as external to prevent bundling issues on Vercel.
   * firebase-admin has ESM/CommonJS compatibility issues with Turbopack.
   */
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
