import type { NextConfig } from 'next';

/**
 * GLOBAL POOL web — DEMO / testnet only. NEXT_PUBLIC_* values are inlined at build time
 * (see ../../.env.example and the Dockerfile `web-build` stage).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lint runs as its own step (`pnpm --filter @gp/web lint`) with the shared flat config.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizePackageImports: ['lucide-react', 'radix-ui'],
  },
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]);
  },
};

export default nextConfig;
