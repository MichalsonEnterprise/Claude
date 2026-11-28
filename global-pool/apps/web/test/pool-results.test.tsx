/**
 * Round results and odds as players see them (close-out pass 2):
 * - R16b: /pool/history "Your result" sums every purchase of a round (the API reports each purchase's own refund /
 *   prize since R16), so a second purchase never hides the first one's refund or win.
 * - R48b: every screen that shows the disclosed odds rounds DOWN (never overstated) — account dashboard and hero too.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { approxPercent } from '@/components/account/dashboard/balances';
import { HeroSection } from '@/components/home/hero';
import { HomeViewProvider, type HomeView } from '@/components/home/home-context';
import { roundResultOf } from '@/components/pool/history-page';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { EntryHistoryItem, EntryResultKind } from '@/lib/api/pool';
import { mockMyEntries, mockPoolSnapshot } from '@/lib/data/mock-home';
import { prefetchHome } from '@/lib/data/queries';
import { DEFAULT_SCENARIO } from '@/lib/data/types';

const purchase = (
  entries: number,
  kind: EntryResultKind,
  extra: Partial<EntryHistoryItem['result']> = {},
): EntryHistoryItem => ({
  reference: `EP-${entries}`,
  transactionId: `tx-${entries}-${kind}`,
  roundId: 'r-1',
  roundNumber: 1245,
  roundStatus: kind === 'won' || kind === 'not_selected' ? 'settled' : 'cancelled',
  roundClosesAt: '2026-11-25T20:00:00.000Z',
  entries,
  firstEntryId: null,
  lastEntryId: null,
  entryAmount: `${entries * 10}.00`,
  platformFee: (entries * 0.05).toFixed(2),
  networkFee: '0.00',
  total: (entries * 10.05).toFixed(2),
  purchasedAt: '2026-11-25T10:00:00.000Z',
  result: { kind, prize: null, winningEntryIds: [], refund: null, ...extra },
  isDemo: false,
});

describe('round result over all purchases of the round (R16b)', () => {
  it('cancelled round, 35 then 10 entries: refund 450.00 owed (not only the latest purchase)', () => {
    // API order: newest purchase first.
    const rows = [
      purchase(10, 'refund_owed', { refund: '100.00' }),
      purchase(35, 'refund_owed', { refund: '350.00' }),
    ];
    expect(roundResultOf(rows)).toEqual({ kind: 'refund_owed', prize: null, refund: '450.00' });
  });

  it('settled round where only the OLDER purchase won: the round reads "won" with that prize', () => {
    const rows = [
      purchase(10, 'not_selected'),
      purchase(35, 'won', { prize: '18640.00', winningEntryIds: ['E-1245-00990'] }),
    ];
    expect(roundResultOf(rows)).toEqual({ kind: 'won', prize: '18640.00', refund: null });
  });

  it('prizes of several winning purchases add up; refunds already paid out are not "owed"', () => {
    expect(
      roundResultOf([
        purchase(2, 'won', { prize: '1864.00' }),
        purchase(3, 'won', { prize: '932.00' }),
      ]),
    ).toMatchObject({ kind: 'won', prize: '2796.00' });
    expect(
      roundResultOf([
        purchase(10, 'refunded', { refund: '100.00' }),
        purchase(35, 'refund_owed', { refund: '350.00' }),
      ]),
    ).toEqual({ kind: 'refund_owed', prize: null, refund: '350.00' });
    expect(roundResultOf([purchase(10, 'refunded', { refund: '100.00' })])).toMatchObject({
      kind: 'refunded',
      refund: '100.00',
    });
    expect(roundResultOf([purchase(10, 'not_selected'), purchase(5, 'not_selected')])).toEqual({
      kind: 'not_selected',
      prize: null,
      refund: null,
    });
  });
});

describe('odds shown to players are rounded down (R48b)', () => {
  it('account dashboard (USR-01 Active Pool) never overstates the disclosed chance', () => {
    expect(approxPercent('0.187768')).toBe('0.187%'); // was "0.19%"
    expect(approxPercent('66.666666')).toBe('66.66%'); // was "66.67%"
    expect(approxPercent('0.066666')).toBe('0.0666%'); // was "0.07%"
    expect(approxPercent('0.866666')).toBe('0.866%'); // was "0.87%"
  });

  it('hero shows the 6-decimal API odds rounded down to the display precision', async () => {
    const qc = new QueryClient();
    await prefetchHome(qc, DEFAULT_SCENARIO);
    const snapshot = mockPoolSnapshot(DEFAULT_SCENARIO);
    const view: HomeView = {
      viewer: 'member',
      restricted: false,
      countryName: 'Portugal',
      scenario: DEFAULT_SCENARIO,
      snapshot,
      demoNow: snapshot.serverNow,
      now: new Date(snapshot.serverNow).getTime(),
      myEntries: {
        ...mockMyEntries(),
        odds: { anyPrizeApproxPercent: '2.440987', firstPrizePercent: '0.187768' },
      },
      balance: { available: '9215.30', isDemo: true },
      signIn: () => {},
      signUp: () => {},
    };
    const out = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <HomeViewProvider value={view}>
            <HeroSection />
          </HomeViewProvider>
        </TooltipProvider>
      </QueryClientProvider>,
    );
    expect(out).toContain('≈2.44% chance of any prize');
    expect(out).toContain('≈2.44% any prize');
    expect(out).not.toContain('2.440987');
  });
});
