/**
 * Public runtime configuration (NEXT_PUBLIC_* values are inlined at build time — see ../../.env.example).
 * Each variable must be read with a literal `process.env.NEXT_PUBLIC_…` access so Next.js can inline it.
 */
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';

export const publicEnv = {
  /** Privy app id. Empty → DEV MOCK auth (owner decision #3). */
  privyAppId,
  privyClientId: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined,
  /** True when the web must use the offline mock auth provider (no app id, or NEXT_PUBLIC_PRIVY_MOCK=true). */
  privyMock: privyAppId === '' || process.env.NEXT_PUBLIC_PRIVY_MOCK === 'true',
  /** DEMO mode shows the DEMO bar/badges. The platform is DEMO / testnet only, so this defaults to true. */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== 'false',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;
