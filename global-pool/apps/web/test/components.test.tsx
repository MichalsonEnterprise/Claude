import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Logo } from '@/components/brand/logo';
import { Amount } from '@/components/domain/amount';
import { GameTile } from '@/components/domain/game-tile';
import { JackpotMeter } from '@/components/domain/jackpot-meter';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge, DemoBar } from '@/components/ui/demo-badge';

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('money display', () => {
  it('formats signed amounts with the typographic minus and never floats', () => {
    expect(html(<Amount value="-1500" tone="signed" />)).toContain('−1,500.00');
    expect(html(<Amount value="1000" tone="signed" />)).toContain('+1,000.00');
    expect(html(<Amount value="9215.30" />)).toContain('9,215.30');
  });
  it('jackpot meter exposes the full amount to screen readers', () => {
    const out = html(<JackpotMeter amount="186400.00" demo live />);
    expect(out).toContain('186,400.00 USDT');
    expect(out).toContain('Demo');
  });
});

describe('DEMO markers', () => {
  it('renders sizes and the page notice', () => {
    expect(html(<DemoBadge size="m" />)).toContain('Demo data');
    expect(html(<DemoBadge size="xs" />)).toContain('Demo');
    const bar = html(<DemoBar />);
    expect(bar).toContain('role="note"');
    expect(bar).toContain('illustrative only and not real');
  });
});

describe('status badges', () => {
  it('pairs an icon with a label', () => {
    const out = html(<StatusBadge status="under_review" />);
    expect(out).toContain('Under review');
    expect(out).toContain('<svg');
  });
});

describe('buttons', () => {
  it('loading disables the button and marks it busy', () => {
    const out = html(<Button loading>Withdraw</Button>);
    expect(out).toContain('disabled=""');
    expect(out).toContain('aria-busy="true"');
  });
});

describe('game tile', () => {
  it('discloses the house edge in the link name', () => {
    const out = html(
      <GameTile
        game="orbit-rush"
        name="Orbit Rush"
        href="/games/orbit-rush"
        edgeLabel="1.00% house edge"
        players={1062}
      />,
    );
    expect(out).toContain('href="/games/orbit-rush"');
    expect(out).toContain('1.00% house edge');
    expect(out).toContain('1,062 players (demo)');
  });
  it('restricted tiles are not links', () => {
    const out = html(
      <GameTile
        game="pool-roulette"
        name="Pool Roulette"
        href="/x"
        edgeLabel="2.70% house edge"
        restricted
      />,
    );
    expect(out).not.toContain('href=');
    expect(out).toContain('Not available in your region');
  });
});

describe('logo', () => {
  it('is an accessible inline SVG with one gold dollar per letter', () => {
    const out = html(<Logo />);
    expect(out).toContain('aria-label="GLOBAL POOL"');
    expect((out.match(/fill-gold/g) ?? []).length).toBe(10);
  });
});
