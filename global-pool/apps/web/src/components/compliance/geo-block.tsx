'use client';

import {
  ArrowUpFromLine,
  BookOpen,
  ChevronRight,
  Clock,
  History,
  Info,
  LogIn,
  MapPin,
  MessageCircle,
  Plane,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Overline } from '@/components/auth/auth-ui';
import { Logo } from '@/components/brand/logo';
import { GameTile } from '@/components/domain/game-tile';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DemoBadge, DemoBar } from '@/components/ui/demo-badge';
import type { GeoDecision } from '@/lib/api/compliance';
import { useAuth } from '@/lib/auth';
import { publicEnv } from '@/lib/env';
import { cn } from '@/lib/utils';

import { regulatoryCopy } from './regulatory-copy';
import { RegulatoryFooter } from './regulatory-state';
import { GATE_ROUTES } from './routes';

const pad = (n: number) => String(n).padStart(2, '0');
const utcTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
};

/** "Log in to withdraw" for guests (sign-in dialog → withdraw page), "Withdraw funds" for members. */
function useWithdrawCta() {
  const auth = useAuth();
  const member = auth.status === 'member';
  const open = () =>
    auth.openAuth ? auth.openAuth('sign-in', { next: GATE_ROUTES.withdraw }) : auth.signIn();
  return { member, open, label: member ? 'Withdraw funds' : 'Log in to withdraw' };
}

function WithdrawButton({
  className,
  size = 'l',
  block,
}: {
  className?: string;
  size?: 'm' | 'l';
  block?: boolean;
}) {
  const cta = useWithdrawCta();
  return cta.member ? (
    <Button
      asChild
      size={size}
      block={block}
      leadingIcon={<ArrowUpFromLine />}
      className={className}
    >
      <Link href={GATE_ROUTES.withdraw}>{cta.label}</Link>
    </Button>
  ) : (
    <Button
      size={size}
      block={block}
      leadingIcon={<LogIn />}
      className={className}
      onClick={cta.open}
    >
      {cta.label}
    </Button>
  );
}

/** Focused top bar of the gate pages: logo + Log in (Sign up disabled in a restricted region). */
export function GateTopbar({ restricted = false }: { restricted?: boolean }) {
  const auth = useAuth();
  const member = auth.status === 'member';
  return (
    <header className="sticky top-[var(--gp-shell-top,0px)] z-30 flex h-topbar shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-base/95 px-4 backdrop-blur-md laptop:px-8">
      <Link
        href="/"
        aria-label="GLOBAL POOL — lobby"
        className="flex shrink-0 items-center rounded-sm"
      >
        <Logo height={28} className="hidden tablet:block" />
        <Logo variant="mark" height={28} className="tablet:hidden" />
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {member ? (
          <Button asChild size="s" variant="secondary">
            <Link href="/account">Account</Link>
          </Button>
        ) : (
          <>
            <Button
              size="s"
              variant="secondary"
              onClick={() =>
                auth.openAuth
                  ? auth.openAuth('sign-in', { next: GATE_ROUTES.withdraw })
                  : auth.signIn()
              }
            >
              Log in
            </Button>
            <Button
              size="s"
              disabled={restricted}
              aria-describedby={restricted ? 'gp-signup-restricted' : undefined}
              onClick={() => (auth.openAuth ? auth.openAuth('sign-up') : auth.signUp())}
            >
              Sign up
            </Button>
            {restricted && (
              <span id="gp-signup-restricted" className="sr-only">
                Sign-up isn’t available in your region
              </span>
            )}
          </>
        )}
      </div>
    </header>
  );
}

function ActionRow({
  icon: Icon,
  title,
  body,
  href,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-raised text-icon-default [&_svg]:size-5">
        <Icon aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-s-strong text-text-primary">{title}</span>
        <span className="text-caption text-text-secondary">{body}</span>
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-icon-muted" />
    </>
  );
  const cls =
    'flex min-h-14 w-full items-center gap-3 rounded-lg border border-border-subtle bg-surface-default p-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus';
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

const LOCKED_TILES = [
  { game: 'global-pool', name: 'Global Pool', subtitle: 'DAILY JACKPOT' },
  { game: 'orbit-rush', name: 'Orbit Rush', subtitle: 'GLOBAL POOL ORIGINAL' },
  { game: 'pool-dice', name: 'Pool Dice', subtitle: 'GLOBAL POOL ORIGINAL' },
  { game: 'pool-roulette', name: 'Pool Roulette', subtitle: 'GLOBAL POOL ORIGINAL' },
] as const;

/** Locked-tiles preview on angled mint / charcoal blocks (decorative; tiles are not links). */
function LockedPreview() {
  return (
    <div
      aria-hidden
      className="relative isolate min-h-[300px] overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary laptop:min-h-[420px]"
    >
      <div className="absolute -left-24 top-[120px] h-[140px] w-[760px] -rotate-[12deg] bg-surface-raised" />
      <div className="absolute -left-24 top-[250px] h-[46px] w-[760px] -rotate-[12deg] bg-brand" />
      <div className="relative grid grid-cols-2 justify-items-center gap-3 p-6 tablet:grid-cols-4 laptop:grid-cols-2 laptop:p-10">
        {LOCKED_TILES.map((t, i) => (
          <div key={t.game} className={cn(i % 2 === 1 && 'translate-y-6')}>
            <GameTile
              game={t.game}
              name={t.name}
              subtitle={t.subtitle}
              href="#"
              edgeLabel=""
              restricted
              demo={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * PUB-21 Geo-block interstitial — full screen, before any gaming or financial page, for a restricted location
 * (decided by the API: `GET /compliance/region` / `/compliance/geo`). No sidebar, no tab bar (navigation is
 * blocked); log in to withdraw, support, licence and the restricted-countries list stay open. No VPN / proxy /
 * bypass hints — the travel note asks people NOT to use one.
 */
export function GeoBlockInterstitial({ decision }: { decision: GeoDecision }) {
  const cta = useWithdrawCta();
  const copy = regulatoryCopy('region', {
    countryName: decision.countryName,
    signedIn: cta.member,
  });
  const where = decision.countryName ?? decision.country;
  return (
    <div
      className="flex min-h-dvh flex-col bg-bg-base"
      style={{ '--gp-shell-top': publicEnv.demoMode ? '36px' : '0px' } as React.CSSProperties}
      data-gate="geo-block"
    >
      {publicEnv.demoMode && <DemoBar className="sticky top-0 z-40" />}
      <Alert
        type="restricted"
        layout="full"
        title="Not available in your region"
        actions={
          <Button size="s" variant="ghost" asChild>
            <Link href={GATE_ROUTES.restrictedCountries}>Restricted countries</Link>
          </Button>
        }
      >
        GLOBAL POOL games are not available in your region{where ? ` (${where})` : ''}. You can
        still view your account and withdraw funds.
      </Alert>
      <GateTopbar restricted />
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 px-4 pt-6 pb-28 outline-none tablet:px-6 tablet:pb-16 laptop:px-8 laptop:pt-10"
      >
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
          <div className="grid gap-8 laptop:grid-cols-[minmax(0,1fr)_440px] laptop:items-start">
            <section className="flex flex-col gap-5">
              <Overline tone="warning">{copy.overline}</Overline>
              <h1 className="text-h3 text-text-primary tablet:text-h1">{copy.title}</h1>
              <p className="text-body-m text-text-secondary tablet:text-body-l">{copy.body}</p>

              <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:flex-row tablet:items-center tablet:p-5">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-status-warning-tint text-text-warning [&_svg]:size-5">
                  <MapPin aria-hidden />
                </span>
                <dl className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <dt className="text-caption text-text-tertiary">Detected region</dt>
                  <dd className="flex flex-wrap items-center gap-2 text-body-m-strong text-text-primary">
                    {where ?? 'Location not confirmed'}
                    {decision.isDemo && <DemoBadge size="xs" />}
                  </dd>
                  {utcTime(decision.checkedAt) && (
                    <dd className="flex items-center gap-1.5 text-caption text-text-tertiary">
                      <Clock aria-hidden className="size-3.5" /> Checked at{' '}
                      {utcTime(decision.checkedAt)}
                    </dd>
                  )}
                </dl>
                <Link
                  href={GATE_ROUTES.support}
                  className="text-label-m text-text-brand hover:underline"
                >
                  Wrong location? Tell support
                </Link>
              </div>

              <div className="hidden tablet:flex">
                <WithdrawButton />
              </div>

              <section aria-labelledby="gp-geo-can" className="flex flex-col gap-3">
                <h2 id="gp-geo-can" className="text-h5 text-text-primary">
                  What you can still do
                </h2>
                {cta.member ? (
                  <ActionRow
                    icon={ArrowUpFromLine}
                    title="Withdraw your balance"
                    body="To your whitelisted address — security checks apply as usual."
                    href={GATE_ROUTES.withdraw}
                  />
                ) : (
                  <ActionRow
                    icon={LogIn}
                    title="Log in to withdraw"
                    body="Your balance stays yours — sign in and withdraw to your whitelisted address."
                    onClick={cta.open}
                  />
                )}
                {cta.member && (
                  <ActionRow
                    icon={History}
                    title="See your entries and history"
                    body="Entries already in a round stay in the draw and settle normally."
                    href={GATE_ROUTES.entries}
                  />
                )}
                <ActionRow
                  icon={MessageCircle}
                  title="Contact support"
                  body="Questions about your account or this check — a person will help."
                  href={GATE_ROUTES.support}
                />
                <ActionRow
                  icon={BookOpen}
                  title="Restricted countries"
                  body="The full list, and why each country is restricted."
                  href={GATE_ROUTES.restrictedCountries}
                />
              </section>

              <p className="flex gap-3 rounded-lg border border-border-subtle bg-bg-secondary px-4 py-3 text-body-s text-text-secondary">
                <Plane aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
                <span>{copy.note}</span>
              </p>
            </section>

            <aside className="flex flex-col gap-4" aria-label="Licence and jurisdiction">
              <LockedPreview />
              <section className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-default p-4">
                <p className="flex items-center gap-2 text-label-l text-text-primary">
                  <ShieldCheck aria-hidden className="size-4 text-icon-brand" /> Why it’s restricted
                </p>
                <p className="text-body-s text-text-secondary">
                  GLOBAL POOL is offered only where an applicable gaming licence permits it, and the
                  check runs on our servers for every game, entry and deposit. This is a DEMO /
                  testnet build: test funds and DEMO credits only, no real money.
                </p>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-label-s">
                  <Link className="text-text-brand hover:underline" href={GATE_ROUTES.licence}>
                    Licence information
                  </Link>
                  <Link className="text-text-brand hover:underline" href={GATE_ROUTES.terms}>
                    Terms
                  </Link>
                  <Link
                    className="text-text-brand hover:underline"
                    href={GATE_ROUTES.responsibleGaming}
                  >
                    Responsible gaming
                  </Link>
                </p>
              </section>
            </aside>
          </div>
          <RegulatoryFooter />
        </div>
      </main>
      {/* Mobile: sticky CTA, no tab bar (navigation is blocked). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-bg-base/95 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-md tablet:hidden">
        <WithdrawButton block />
        <p className="mt-2 flex items-center justify-center gap-1.5 text-caption text-text-tertiary">
          <Info aria-hidden className="size-3.5" /> Withdrawals stay open in every region where the
          law allows.
        </p>
      </div>
    </div>
  );
}

/**
 * The PUB-21 page (`/region-unavailable`): the interstitial for a restricted location, or an honest "available"
 * state when the API says this location is permitted.
 */
export function RegionUnavailablePage({
  decision,
  loading,
  error,
  onRetry,
  retrying = false,
}: {
  decision: GeoDecision | undefined;
  loading: boolean;
  error: boolean;
  /** ERR-02: re-run the region check after a failure. */
  onRetry?: () => void;
  retrying?: boolean;
}) {
  if (decision && !decision.permitted) return <GeoBlockInterstitial decision={decision} />;
  return (
    <div className="flex min-h-dvh flex-col bg-bg-base" data-gate="region-check">
      {publicEnv.demoMode && <DemoBar className="sticky top-0 z-40" />}
      <GateTopbar />
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-10 pb-16">
        <section className="flex w-full max-w-[560px] flex-col items-start gap-4 rounded-xl border border-border-subtle bg-surface-default p-6 tablet:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-lg bg-surface-raised text-icon-default [&_svg]:size-6">
            <MapPin aria-hidden />
          </span>
          {loading ? (
            <p className="text-body-m text-text-secondary" aria-busy>
              Checking where GLOBAL POOL is available…
            </p>
          ) : error || !decision ? (
            <>
              <h1 className="text-h3 text-text-primary">We couldn’t check your region</h1>
              <p className="text-body-s text-text-secondary">
                Try again in a moment. The check also runs on our servers for every game, entry and
                deposit.
              </p>
              {onRetry && (
                <Button variant="secondary" size="m" onClick={onRetry} loading={retrying}>
                  Try again
                </Button>
              )}
            </>
          ) : (
            <>
              <h1 className="text-h3 text-text-primary">
                GLOBAL POOL is available{decision.countryName ? ` in ${decision.countryName}` : ''}
              </h1>
              <p className="flex items-center gap-2 text-body-s text-text-secondary">
                Your current location is permitted.{decision.isDemo && <DemoBadge size="xs" />}
              </p>
              <Button asChild size="l">
                <Link href="/">Go to the lobby</Link>
              </Button>
            </>
          )}
          <RegulatoryFooter className="pt-2" />
        </section>
      </main>
    </div>
  );
}
