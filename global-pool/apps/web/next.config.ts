import path from 'node:path';

import type { NextConfig } from 'next';

/**
 * GLOBAL POOL web — DEMO / testnet only. NEXT_PUBLIC_* values are inlined at build time
 * (see ../../.env.example and the Dockerfile `web-build` stage).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The repo root has an unrelated package-lock.json; pin tracing to the pnpm workspace root
  // (next build always runs with cwd = apps/web).
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  // Lint runs as its own step (`pnpm --filter @gp/web lint`) with the shared flat config.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizePackageImports: ['lucide-react', 'radix-ui'],
  },
  webpack(config: { resolve: { alias: Record<string, string | false> } }) {
    // Optional Privy peer (Farcaster mini-app Solana bridge) that this app never uses.
    config.resolve.alias['@farcaster/mini-app-solana'] = false;
    return config;
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
