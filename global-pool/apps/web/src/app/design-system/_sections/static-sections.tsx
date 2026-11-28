import { colors } from '@gp/tokens';
import { CHAIN_KEYS } from '@gp/shared/chains';
import { DEMO_BALANCES, DEMO_GAMES, DEMO_TRANSACTIONS } from '@gp/shared/demo';
import { TX_STATUS_LABEL, type TxStatus } from '@gp/shared/enums';
import { formatDateTimeUTC } from '@gp/shared/format';
import { ArrowRight, Plus, Settings, Ticket, Trash2, Users, Wallet } from 'lucide-react';

import { CHAIN_NAMES, ChainMark, TokenMark } from '@/components/brand/chain-mark';
import { isGameArtKey } from '@/components/brand/game-art';
import { Logo } from '@/components/brand/logo';
import { AddressChip } from '@/components/domain/address-chip';
import { Amount } from '@/components/domain/amount';
import { BalanceCard } from '@/components/domain/balance-card';
import { GameTile } from '@/components/domain/game-tile';
import { NetworkPill } from '@/components/domain/network-pill';
import { StatCard } from '@/components/domain/stat-card';
import { Avatar } from '@/components/ui/avatar';
import {
  AgeBadge,
  CountBadge,
  STATUS_SPEC,
  StatusBadge,
  Tag,
  VipBadge,
  type BadgeStatus,
} from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Overline,
} from '@/components/ui/card';
import { DemoBadge, DemoBar } from '@/components/ui/demo-badge';
import {
  CellStack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DsSection, Specimen } from './ds';

// ── Foundations ────────────────────────────────────────────────────────────────────────────────

const SWATCHES = [
  'bg-base',
  'bg-secondary',
  'surface-default',
  'surface-raised',
  'border-default',
  'border-strong',
  'brand-primary',
  'brand-primary-hover',
  'accent-gold',
  'accent-gold-strong',
  'text-primary',
  'text-secondary',
  'text-tertiary',
  'status-success',
  'status-danger',
  'status-warning',
  'status-info',
  'status-pending',
  'balance-available',
  'balance-locked',
  'balance-pending',
  'balance-owed',
] as const satisfies readonly (keyof typeof colors)[];

const TYPE = [
  ['text-display-m', 'Display M 48'],
  ['text-h1', 'Heading H1 40'],
  ['text-h2', 'Heading H2 32'],
  ['text-h3', 'Heading H3 24'],
  ['text-h4', 'Heading H4 20'],
  ['text-h5', 'Heading H5 18'],
  ['text-body-l', 'Body L 18 — Every entry is verifiable.'],
  ['text-body-m', 'Body M 16 — Every entry is verifiable.'],
  ['text-body-s', 'Body S 14 — Every entry is verifiable.'],
  ['text-label-m', 'Label M 14 / 600'],
  ['text-caption', 'Caption 12 — 27 Nov 2026, 18:42 UTC'],
  ['text-overline', 'OVERLINE 11'],
  ['text-number-l', '186,400.00'],
  ['text-number-m', '9,215.30'],
  ['text-mono-m', '0x12ab…9f3C · 0x9f2c…e71a'],
] as const;

export function FoundationsSection() {
  return (
    <DsSection
      id="foundations"
      title="Foundations"
      description="Tokens come from @gp/tokens (mirror of the Figma variables). Only semantic classes are used in product code; Tailwind's default palette is removed."
    >
      <Specimen
        label="Semantic colours"
        bodyClassName="items-stretch grid grid-cols-2 gap-3 tablet:grid-cols-4 laptop:grid-cols-6"
      >
        {SWATCHES.map((name) => (
          <div key={name} className="flex flex-col gap-1.5">
            <span
              className="h-12 rounded-md border border-border-subtle"
              style={{ backgroundColor: colors[name] }}
            />
            <span className="text-caption text-text-primary">{name}</span>
            <span className="font-mono text-mono-s text-text-tertiary">{colors[name]}</span>
          </div>
        ))}
      </Specimen>
      <Specimen label="Typography (Inter · Geist Mono)" bodyClassName="flex-col items-start gap-2">
        {TYPE.map(([cls, sample]) => (
          <p
            key={cls}
            className={`${cls} ${cls === 'text-mono-m' ? 'font-mono' : ''} max-w-full truncate`}
          >
            {sample}
          </p>
        ))}
      </Specimen>
      <Specimen label="Radius xs 4 · sm 6 · md 10 · lg 14 · xl 20 · 2xl 28">
        {['rounded-xs', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl'].map(
          (r) => (
            <span
              key={r}
              className={`flex size-16 items-center justify-center border border-border-default bg-surface-raised text-caption text-text-tertiary ${r}`}
            >
              {r.replace('rounded-', '')}
            </span>
          ),
        )}
      </Specimen>
      <Specimen label="Elevation 1–4 · focus ring">
        {[
          'shadow-elevation-1',
          'shadow-elevation-2',
          'shadow-elevation-3',
          'shadow-elevation-4',
          'shadow-focus-ring',
        ].map((s) => (
          <span
            key={s}
            className={`flex h-16 w-28 items-center justify-center rounded-lg bg-surface-default text-caption text-text-tertiary ${s}`}
          >
            {s.replace('shadow-', '')}
          </span>
        ))}
      </Specimen>
      <Specimen label="Gradients">
        {[
          'bg-gradient-gold-jackpot',
          'bg-gradient-brand-solid',
          'bg-gradient-gold-tint',
          'bg-gradient-skeleton',
          'bg-gradient-tile-gold',
          'bg-gradient-tile-violet',
          'bg-gradient-tile-sky',
          'bg-gradient-tile-amber',
          'bg-gradient-tile-red',
          'bg-gradient-tile-mint',
        ].map((g) => (
          <span
            key={g}
            className={`h-16 w-24 rounded-md border border-border-subtle ${g}`}
            title={g}
          />
        ))}
      </Specimen>
    </DsSection>
  );
}

// ── Brand ──────────────────────────────────────────────────────────────────────────────────────

export function BrandSection() {
  return (
    <DsSection
      id="brand"
      title="Brand & marks"
      description="Inline SVG logo (decision #24) and original neutral chain / token glyphs (decision #9)."
    >
      <Specimen label="Logo — full (56 / 36 / 24)" bodyClassName="flex-col items-start gap-6">
        <Logo height={56} />
        <Logo height={36} />
        <Logo height={24} />
      </Specimen>
      <Specimen label="Logo mark (48 / 32 / 24 / 16)" bodyClassName="items-end gap-6">
        <Logo variant="mark" height={48} />
        <Logo variant="mark" height={32} />
        <Logo variant="mark" height={24} />
        <Logo variant="mark" height={16} />
      </Specimen>
      <Specimen label="ChainMark + TokenMark (32 / 20)" bodyClassName="gap-6">
        {CHAIN_KEYS.map((c) => (
          <span key={c} className="flex items-center gap-2 text-body-s">
            <ChainMark chain={c} size={32} />
            <ChainMark chain={c} size={20} />
            {CHAIN_NAMES[c]}
          </span>
        ))}
        <span className="flex items-center gap-2 text-body-s">
          <TokenMark size={32} />
          <TokenMark size={20} />
          USDT
        </span>
      </Specimen>
    </DsSection>
  );
}

// ── Buttons ────────────────────────────────────────────────────────────────────────────────────

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'gold'] as const;
const STATE_PREVIEW: Record<(typeof VARIANTS)[number], { hover: string; pressed: string }> = {
  primary: { hover: 'bg-brand-hover', pressed: 'bg-brand-pressed' },
  secondary: { hover: 'bg-ink-600 border-border-strong', pressed: 'bg-ink-550' },
  ghost: { hover: 'bg-surface-hover', pressed: 'bg-surface-pressed' },
  danger: { hover: 'bg-status-danger-hover', pressed: 'bg-red-700' },
  gold: { hover: 'bg-gold-soft', pressed: 'bg-gold-strong' },
};
const LABEL: Record<(typeof VARIANTS)[number], string> = {
  primary: 'Deposit',
  secondary: 'Round details',
  ghost: 'How it works',
  danger: 'Self-exclude',
  gold: 'Participate',
};

export function ButtonsSection() {
  return (
    <DsSection
      id="buttons"
      title="Buttons"
      description="Primary mint with dark label · Secondary · Ghost · Danger · Gold (jackpot CTA only) · Icon. Sizes S 32 / M 40 / L 48. Hover / pressed / focus are shown as static previews."
    >
      {VARIANTS.map((v) => (
        <Specimen key={v} label={`${v} — default · hover · pressed · focus · disabled · loading`}>
          <Button variant={v}>{LABEL[v]}</Button>
          <Button variant={v} className={STATE_PREVIEW[v].hover}>
            Hover
          </Button>
          <Button variant={v} className={STATE_PREVIEW[v].pressed}>
            Pressed
          </Button>
          <Button variant={v} className="outline-2 outline-offset-2 outline-border-focus">
            Focus
          </Button>
          <Button variant={v} disabled>
            Disabled
          </Button>
          <Button variant={v} loading>
            Loading
          </Button>
        </Specimen>
      ))}
      <Specimen label="Sizes S / M / L with icons">
        <Button size="s" leadingIcon={<Plus />}>
          Small
        </Button>
        <Button size="m" leadingIcon={<Wallet />}>
          Medium
        </Button>
        <Button size="l" trailingIcon={<ArrowRight />}>
          Large
        </Button>
        <Button variant="gold" size="l" leadingIcon={<Ticket />}>
          Confirm 35 entries · 351.75 USDT
        </Button>
        <Button variant="link">Terms apply</Button>
      </Specimen>
      <Specimen label="Icon buttons — ghost / secondary · S / M / L · disabled">
        <IconButton label="Settings" size="s">
          <Settings />
        </IconButton>
        <IconButton label="Settings" size="m">
          <Settings />
        </IconButton>
        <IconButton label="Settings" size="l">
          <Settings />
        </IconButton>
        <IconButton label="Users" variant="secondary" size="s">
          <Users />
        </IconButton>
        <IconButton label="Users" variant="secondary" size="m">
          <Users />
        </IconButton>
        <IconButton label="Delete" variant="secondary" size="l" disabled>
          <Trash2 />
        </IconButton>
      </Specimen>
    </DsSection>
  );
}

// ── Badges ─────────────────────────────────────────────────────────────────────────────────────

export function BadgesSection() {
  const statuses = Object.keys(STATUS_SPEC) as BadgeStatus[];
  return (
    <DsSection
      id="badges"
      title="Badges & DEMO markers"
      description="Every status pairs an icon with a label. DEMO: XS in table cells, S beside values / cards, M (DEMO DATA) in section headers; the DEMO bar is the first element of every DEMO page."
    >
      <Specimen label="Status — S">
        {statuses.map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </Specimen>
      <Specimen label="Status — M">
        {statuses.map((s) => (
          <StatusBadge key={s} status={s} size="m" />
        ))}
      </Specimen>
      <Specimen label="DEMO XS / S / M · count · VIP · 18+ · tags">
        <DemoBadge size="xs" />
        <DemoBadge size="s" />
        <DemoBadge size="m" />
        <CountBadge count={3} />
        <CountBadge count={35} tone="neutral" size="m" />
        <CountBadge count={128} tone="brand" />
        {(['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const).map((t) => (
          <VipBadge key={t} tier={t} />
        ))}
        <AgeBadge />
        <Tag tone="brand">Live</Tag>
        <Tag tone="danger">Hot</Tag>
        <Tag tone="brand">New</Tag>
        <Tag>Originals</Tag>
      </Specimen>
      <Specimen label="DEMO bar (full width; short copy below 768 px)" bodyClassName="block">
        <DemoBar className="rounded-md border" />
      </Specimen>
      <Specimen label="Avatar XS / S / M / L / XL · status">
        <Avatar initials="NK" size="xs" />
        <Avatar initials="NK" size="s" />
        <Avatar initials="NK" size="m" tone="brand" status="online" />
        <Avatar initials="OR" size="l" status="away" />
        <Avatar initials="MS" size="xl" />
        <Avatar initials="KE" size="l" tone="neutral" />
      </Specimen>
    </DsSection>
  );
}

// ── Cards ──────────────────────────────────────────────────────────────────────────────────────

export function CardsSection() {
  return (
    <DsSection
      id="cards"
      title="Cards"
      description="Card variants, Card/Stat and Card/Balance (values reconcile: 12,480.50 = 9,215.30 + 1,850.00 + 1,000.00 + 415.20)."
    >
      <Specimen
        label="Card variants"
        bodyClassName="items-stretch grid grid-cols-1 gap-4 tablet:grid-cols-2 laptop:grid-cols-3"
      >
        {(['default', 'raised', 'outline', 'sunken', 'gold', 'interactive'] as const).map((v) => (
          <Card key={v} variant={v}>
            <CardHeader>
              <div>
                <Overline>{v}</Overline>
                <CardTitle>Round #1,248</CardTitle>
              </div>
              <DemoBadge size="s" />
            </CardHeader>
            <CardContent>
              <CardDescription>Closes 27 Nov 2026, 20:00 UTC · 3,412 participants</CardDescription>
            </CardContent>
            <CardFooter>
              <Button size="s" variant="secondary">
                Round details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </Specimen>
      <Specimen
        label="StatCard — up / down / neutral · M / L"
        bodyClassName="items-stretch grid grid-cols-1 gap-4 tablet:grid-cols-2 laptop:grid-cols-3"
      >
        <StatCard
          label="Pool balance"
          value="186,400.00"
          unit="USDT"
          delta={{ value: '+7.8%', trend: 'up', context: 'vs round #1,247' }}
          series={[150, 152, 160, 158, 171, 168, 179, 186]}
          demo
        />
        <StatCard
          label="Active users"
          value="41,206"
          delta={{ value: '−2.4%', trend: 'down', context: 'last 30 days' }}
          series={[44, 43, 43.5, 42, 42.4, 41.6, 41.2]}
          demo
        />
        <StatCard
          label="System health"
          value="99.97%"
          delta={{ value: '0.00 pp', trend: 'neutral', context: 'vs yesterday' }}
          demo
        />
        <StatCard
          size="l"
          icon={<Users />}
          label="Participants · round #1,248"
          value="3,412"
          delta={{ value: '+128', trend: 'up', context: 'in the last hour' }}
          series={[2900, 3010, 3120, 3200, 3290, 3412]}
          demo
          className="tablet:col-span-2"
        />
      </Specimen>
      <Specimen
        label="BalanceCard — Total / Available / Locked / Pending / Owed"
        bodyClassName="items-stretch grid grid-cols-1 gap-4 tablet:grid-cols-2 laptop:grid-cols-3"
      >
        <BalanceCard
          type="total"
          amount={DEMO_BALANCES.total}
          composition="Available + Locked + Pending + Owed"
          updatedLabel="Updated 18:42 UTC"
          demo
        />
        <BalanceCard
          type="available"
          amount={DEMO_BALANCES.available}
          total={DEMO_BALANCES.total}
          composition="Usable and withdrawable now"
          updatedLabel="Updated 18:42 UTC"
          demo
        />
        <BalanceCard
          type="locked"
          amount={DEMO_BALANCES.locked}
          total={DEMO_BALANCES.total}
          composition="350.00 in 35 entries (round #1,248) + 1,500.00 pending withdrawal WD-20931"
          demo
        />
        <BalanceCard
          type="pending"
          amount={DEMO_BALANCES.pending}
          total={DEMO_BALANCES.total}
          composition="DP-77412 on Ethereum · 7 / 12 confirmations"
          demo
        />
        <BalanceCard
          type="owed"
          amount={DEMO_BALANCES.owed}
          total={DEMO_BALANCES.total}
          composition="300.00 refund (round #1,245) + 115.20 VIP Gold weekly reward"
          demo
        />
      </Specimen>
    </DsSection>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────────────────────

export function TabsSection() {
  return (
    <DsSection
      id="tabs"
      title="Tabs"
      description="Underline (page sections), Pill (lobby filters), Segmented (2–4 options). Arrow keys move focus."
    >
      <Specimen label="Underline" bodyClassName="block">
        <Tabs defaultValue="overview">
          <TabsList variant="underline">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="entries" count={35}>
              My entries
            </TabsTrigger>
            <TabsTrigger value="winners">Winners</TabsTrigger>
            <TabsTrigger value="fairness">Fairness (VRF)</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="refunds" disabled>
              Refunds
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-body-s text-text-secondary">
            Round #1,248 overview panel.
          </TabsContent>
          <TabsContent value="entries" className="text-body-s text-text-secondary">
            35 entries · E-1248-00981 … E-1248-01015.
          </TabsContent>
        </Tabs>
      </Specimen>
      <Specimen label="Pill" bodyClassName="block">
        <Tabs defaultValue="all">
          <TabsList variant="pill">
            {['All games', 'Roulette', 'Crash', 'Dice', 'Coinflip', 'Blackjack'].map((t, i) => (
              <TabsTrigger key={t} value={i === 0 ? 'all' : t}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Specimen>
      <Specimen label="Segmented 2 / 3 / 4" bodyClassName="flex-col items-start">
        <Tabs defaultValue="deposit">
          <TabsList variant="segmented">
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs defaultValue="7d">
          <TabsList variant="segmented">
            <TabsTrigger value="24h">24h</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs defaultValue="all">
          <TabsList variant="segmented">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="dep">Deposits</TabsTrigger>
            <TabsTrigger value="wd">Withdrawals</TabsTrigger>
            <TabsTrigger value="en">Entries</TabsTrigger>
          </TabsList>
        </Tabs>
      </Specimen>
    </DsSection>
  );
}

// ── Data display ───────────────────────────────────────────────────────────────────────────────

const TX_STATUS: Record<TxStatus, BadgeStatus> = {
  pending: 'pending',
  confirming: 'processing',
  processing: 'processing',
  under_review: 'under_review',
  completed: 'confirmed',
  failed: 'failed',
  rejected: 'rejected',
  cancelled: 'expired',
};

export function DataSection() {
  const rows = DEMO_TRANSACTIONS.slice(0, 6);
  return (
    <DsSection
      id="data"
      title="Data display"
      description="Table primitives (Comfortable 56 / Compact 40), Amount tones, AddressChip, NetworkPill."
    >
      <Specimen label="Table — transactions (DEMO)" bodyClassName="block">
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Transaction</TableHead>
                <TableHead sort="desc">Date</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <CellStack
                      primary={
                        <span className="flex items-center gap-2">
                          {tx.id} <DemoBadge size="xs" />
                        </span>
                      }
                      secondary={tx.description}
                    />
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {formatDateTimeUTC(tx.createdAt)}
                  </TableCell>
                  <TableCell>
                    {tx.network ? (
                      <span className="flex items-center gap-2">
                        <ChainMark chain={tx.network} size={18} /> {CHAIN_NAMES[tx.network]}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">Platform balance</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={TX_STATUS[tx.status]} label={TX_STATUS_LABEL[tx.status]} />
                  </TableCell>
                  <TableCell align="right">
                    <Amount
                      value={tx.direction === 'out' ? `-${tx.amount}` : tx.amount}
                      tone="signed"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Specimen>
      <Specimen label="Amount tones">
        <Amount value="9215.30" className="text-number-m" />
        <Amount value="1000.00" tone="signed" />
        <Amount value="-1500.00" tone="signed" />
        <Amount value="3728.00" tone="gold" />
        <Amount value="0.05" tone="muted" />
      </Specimen>
      <Specimen label="AddressChip S / M · chain · DEMO · copy">
        <AddressChip address="0x12ab…9f3C" chain="bnb" demo />
        <AddressChip address="0x7c4e…a21D" chain="arbitrum" size="s" demo />
        <AddressChip address="7Hq3…Xk9P" chain="solana" demo />
        <AddressChip address="0x9f2c…e71a" copyable={false} size="s" />
      </Specimen>
      <Specimen label="NetworkPill — operational / degraded / congested / down · chevron">
        {CHAIN_KEYS.map((c) => (
          <NetworkPill key={c} chain={c} />
        ))}
        <NetworkPill chain="arbitrum" status="degraded" showStatusLabel />
        <NetworkPill chain="ethereum" status="congested" showStatusLabel />
        <NetworkPill chain="polygon" status="down" showStatusLabel size="s" />
        <NetworkPill chain="arbitrum" showChevron />
      </Specimen>
    </DsSection>
  );
}

// ── Games ──────────────────────────────────────────────────────────────────────────────────────

export function GamesSection() {
  const games = DEMO_GAMES.filter((g) => isGameArtKey(g.slug));
  return (
    <DsSection
      id="games"
      title="Game tiles"
      description="Portrait 3:4 tiles with original SVG art on the tile gradients. Players badge + DEMO; hover / focus = mint border + Play + house edge; restricted = scrim + lock."
    >
      <Specimen label="Default (M 160×213)">
        {games.map((g) =>
          isGameArtKey(g.slug) ? (
            <GameTile
              key={g.id}
              game={g.slug}
              name={g.name}
              subtitle={
                g.category === 'jackpot'
                  ? 'JACKPOT ROUNDS'
                  : g.category === 'table'
                    ? 'TABLE GAME'
                    : 'GLOBAL POOL ORIGINAL'
              }
              href={`/games/${g.slug}`}
              edgeLabel={g.edgeLabel}
              players={g.players}
              tag={
                g.slug === 'global-pool'
                  ? 'live'
                  : g.slug === 'orbit-rush'
                    ? 'hot'
                    : g.slug === 'skyline'
                      ? 'new'
                      : undefined
              }
            />
          ) : null,
        )}
      </Specimen>
      <Specimen label="Hover preview · restricted · small (S 100×133)">
        <GameTile
          game="orbit-rush"
          name="Orbit Rush"
          href="/games/orbit-rush"
          edgeLabel="1.00% house edge"
          players={1062}
          previewHover
        />
        <GameTile
          game="global-pool"
          name="Global Pool"
          subtitle="JACKPOT ROUNDS"
          href="/pool"
          edgeLabel="Fee 0.05 USDT / entry"
          players={3412}
          previewHover
        />
        <GameTile
          game="pool-roulette"
          name="Pool Roulette"
          href="/games/pool-roulette"
          edgeLabel="2.70% house edge"
          restricted
        />
        <GameTile
          game="twenty-one"
          name="Twenty-One"
          href="/games/twenty-one"
          edgeLabel="≈0.50% house edge"
          size="s"
        />
        <GameTile
          game="pool-dice"
          name="Pool Dice"
          href="/games/pool-dice"
          edgeLabel="1.00% house edge"
          size="s"
        />
        <GameTile
          game="double-side"
          name="Double Side"
          href="/games/double-side"
          edgeLabel="2.00% house edge (1.96×)"
          size="s"
          restricted
        />
      </Specimen>
    </DsSection>
  );
}
