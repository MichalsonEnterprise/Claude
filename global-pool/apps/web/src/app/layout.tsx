import '@fontsource-variable/inter';
import './globals.css';

import { GeistMono } from 'geist/font/mono';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'GLOBAL POOL — verifiable global jackpot (DEMO)',
    template: '%s · GLOBAL POOL',
  },
  description:
    'One global pool, every entry verifiable. Chainlink VRF draws on Arbitrum. DEMO / testnet build — no real money. 18+.',
  applicationName: 'GLOBAL POOL',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#232626',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={GeistMono.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
