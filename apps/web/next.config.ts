import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Forward /api/... requests from the browser to the Express backend
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_URL}/api/:path*` }];
  },
};

export default nextConfig;