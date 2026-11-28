import type { DemoFlag, UserCountry, UserDevice, UserProfile, UserWallet } from '../types';
import { demoId } from './ids';
import { demo } from './meta';

/** Demo player @nova.k (demo-data.md → "Demo user"). */
export const DEMO_USER: UserProfile & DemoFlag = demo({
  id: demoId('user', 48213),
  publicId: 'GP-48213',
  handle: 'nova.k',
  displayHandle: '@nova.k',
  displayName: 'Nova K.',
  email: 'nova.k@example.com',
  emailMasked: 'n•••@example.com',
  country: { code: 'PT', name: 'Portugal', permitted: true },
  kyc: { level: 'level_2', status: 'verified', label: 'Level 2 — Verified' },
  vip: {
    tier: 'gold',
    tierIndex: 3,
    tierCount: 5,
    levelLabel: 'Gold III',
    level: 14,
    levelCount: 29,
    points: 12840,
    nextTier: 'platinum',
    nextTierPoints: 20000,
    pointsToNextTier: 7160,
    nextLevelLabel: 'Gold IV',
    nextLevelPoints: 14000,
    pointsToNextLevel: 1160,
  },
  security: {
    twoFactorEnabled: true,
    twoFactorMethod: 'authenticator_app',
    antiPhishingCode: 'AURORA-27',
  },
});

/** Restricted-region example used by gating states. */
export const DEMO_RESTRICTED_COUNTRY: UserCountry & DemoFlag = demo({
  code: 'US',
  name: 'United States',
  permitted: false,
});

/**
 * Wallets. Full addresses are obvious DEMO placeholders (zero-padded, not real wallets) built from the truncated
 * forms in the designs; always display `addressDisplay`.
 */
export const DEMO_WALLETS: (UserWallet & DemoFlag)[] = [
  demo({
    id: demoId('wallet', 1),
    network: 'bnb',
    address: '0x12ab000000000000000000000000000000009f3c',
    addressDisplay: '0x12ab…9f3C',
    isPrimary: true,
    status: 'verified',
    statusLabel: 'Verified',
    whitelisted: true,
    whitelistedAt: null,
  }),
  demo({
    id: demoId('wallet', 2),
    network: 'arbitrum',
    address: '0x7c4e00000000000000000000000000000000a21d',
    addressDisplay: '0x7c4e…a21D',
    isPrimary: false,
    status: 'whitelisted',
    statusLabel: 'Whitelisted 14 Oct 2026',
    whitelisted: true,
    // time from the Figma build notes
    whitelistedAt: '2026-10-14T09:31:00Z',
  }),
  demo({
    id: demoId('wallet', 3),
    network: 'solana',
    address: '7Hq3Demo11111111111111111111111111111111Xk9P',
    addressDisplay: '7Hq3…Xk9P',
    isPrimary: false,
    status: 'connected',
    statusLabel: 'Connected · not whitelisted',
    whitelisted: false,
    whitelistedAt: null,
  }),
];

/** New (non-whitelisted) withdrawal address example from the designs. */
export const DEMO_NEW_ADDRESS_EXAMPLE = demo({
  network: 'arbitrum' as const,
  addressDisplay: '0x3f9a…c47E',
});

export const DEMO_DEVICES: (UserDevice & DemoFlag)[] = [
  demo({
    id: demoId('device', 1),
    device: 'MacBook Pro',
    browser: 'Chrome',
    location: 'Lisbon',
    current: true,
    flagged: false,
    flaggedReason: null,
    flaggedAt: null,
  }),
  demo({
    id: demoId('device', 2),
    device: 'iPhone 15',
    browser: 'Safari',
    location: 'Lisbon',
    current: false,
    flagged: false,
    flaggedReason: null,
    flaggedAt: null,
  }),
  demo({
    id: demoId('device', 3),
    device: 'Windows',
    browser: 'Edge',
    location: 'Madrid',
    current: false,
    flagged: true,
    flaggedReason: 'New device',
    // date from demo-data.md; time from the Figma build notes
    flaggedAt: '2026-11-25T21:07:00Z',
  }),
];
