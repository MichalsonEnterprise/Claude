/**
 * ERR-05 regulatory states — the copy model (server- and client-safe, unit-tested in test/gates.test.ts).
 *
 * One honest pattern for every regulatory block: what happened, what still works (withdraw stays primary where
 * lawful), what is paused, what to do next, human support. Never a workaround: no VPN / proxy / location hints,
 * no "play now" or "end early" shortcuts during a break or self-exclusion.
 */
import { ApiRequestError } from '@/lib/api/client';

import { GATE_ROUTES, LEAVE_URL } from './routes';

export const REGULATORY_KINDS = [
  'region',
  'licence',
  'kyc_required',
  'self_excluded',
  'cooling_off',
  'age',
] as const;
export type RegulatoryKind = (typeof REGULATORY_KINDS)[number];

export type RegulatoryTone = 'warning' | 'info' | 'brand' | 'danger';

export interface RegulatoryContext {
  /** Country the block is about (region). */
  countryName?: string | null;
  /** Product / feature that is not offered (licence), e.g. "Real-money play". */
  product?: string | null;
  /** What needs the KYC level, e.g. "Withdrawals". */
  action?: string | null;
  requiredLevel?: string | null;
  currentLevel?: string | null;
  /** Break / self-exclusion end (ISO); null = permanent. */
  endsAt?: string | null;
  /** The visitor is signed in (withdraw directly) or a guest (sign in to withdraw). */
  signedIn?: boolean;
}

export interface RegulatoryAction {
  label: string;
  href: string;
  /** 'withdraw' actions stay available in every state (no obstruction of withdrawals). */
  role: 'withdraw' | 'sign_in' | 'support' | 'info' | 'kyc' | 'rg' | 'browse' | 'leave';
  external?: boolean;
}

export interface RegulatoryCopy {
  kind: RegulatoryKind;
  tone: RegulatoryTone;
  overline: string;
  title: string;
  body: string;
  stillWorks: { title: string; body: string }[];
  paused: { title: string; body: string }[];
  /** First = primary CTA. */
  actions: RegulatoryAction[];
  note: string | null;
}

const LEVEL_LABEL: Record<string, string> = {
  none: 'not verified',
  level_1: 'Level 1',
  level_2: 'Level 2',
  level_3: 'Level 3',
};
export const kycLevelLabel = (level: string | null | undefined) =>
  level ? (LEVEL_LABEL[level] ?? level) : null;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
/** 27 Nov 2026, 16:42 UTC (absolute, timezone-explicit). */
export function utcDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function withdrawAction(ctx: RegulatoryContext, label = 'Withdraw funds'): RegulatoryAction {
  return ctx.signedIn === false
    ? { label: 'Log in to withdraw', href: GATE_ROUTES.withdraw, role: 'sign_in' }
    : { label, href: GATE_ROUTES.withdraw, role: 'withdraw' };
}

const SUPPORT: RegulatoryAction = {
  label: 'Contact support',
  href: GATE_ROUTES.support,
  role: 'support',
};

export function regulatoryCopy(kind: RegulatoryKind, ctx: RegulatoryContext = {}): RegulatoryCopy {
  switch (kind) {
    case 'region': {
      const where = ctx.countryName ?? null;
      return {
        kind,
        tone: 'warning',
        overline: `Regional restriction${where ? ` · ${where}` : ''}`,
        title: 'GLOBAL POOL isn’t available in your region',
        body: where
          ? `Online gambling needs a licence for each country, and ours doesn’t cover ${where}. Games, Global Pool entries, deposits and promotions are paused while you’re there. Your account and funds are not affected.`
          : 'We couldn’t confirm that you’re in a country our licence covers, so games, Global Pool entries, deposits and promotions are paused. Your account and funds are not affected.',
        stillWorks: [
          {
            title: ctx.signedIn === false ? 'Log in to withdraw' : 'Withdraw your Available balance',
            body: 'To your whitelisted address, unless local law prevents it where you are.',
          },
          {
            title: 'See your account, history and limits',
            body: 'Entries already in a round stay in the draw and settle normally.',
          },
          {
            title: 'Contact support',
            body: 'Questions about your account or your location — a person will help.',
          },
        ],
        paused: [
          { title: 'Games and new Global Pool entries', body: 'Not offered in this region.' },
          { title: 'Deposits and promotions', body: 'Paused while you’re in this region.' },
        ],
        actions: [
          withdrawAction(ctx),
          { label: 'Restricted countries', href: GATE_ROUTES.restrictedCountries, role: 'info' },
          SUPPORT,
        ],
        note: 'Travelling? Play is available again when you’re back in a permitted country. Please don’t use a VPN or proxy — it breaks our Terms and can lead to account closure.',
      };
    }
    case 'licence': {
      const product = ctx.product ?? 'This product';
      return {
        kind,
        tone: 'info',
        overline: 'Licence required',
        title: `${product} isn’t offered in your jurisdiction`,
        body: `We can only offer ${product === 'This product' ? 'a product' : product.toLowerCase()} where an applicable gaming licence covers it. This DEMO / testnet build has no real-money licence: games run as non-monetary simulations with DEMO credits, and the Global Pool uses test-USDT.`,
        stillWorks: [
          {
            title: 'DEMO games with DEMO credits',
            body: 'No cash value — you can’t win or lose real money.',
          },
          {
            title: 'Your account, history and withdrawals',
            body: 'Nothing changes for funds you already hold.',
          },
        ],
        paused: [
          { title: product, body: 'Not available until it is licensed for your jurisdiction.' },
        ],
        actions: [
          { label: 'Browse DEMO games', href: GATE_ROUTES.games, role: 'browse' },
          { label: 'Licence information', href: GATE_ROUTES.licence, role: 'info' },
          SUPPORT,
        ],
        note: null,
      };
    }
    case 'kyc_required': {
      const required = kycLevelLabel(ctx.requiredLevel) ?? 'Level 1';
      const current = kycLevelLabel(ctx.currentLevel);
      const action = ctx.action ?? 'This action';
      return {
        kind,
        tone: 'info',
        overline: 'Verification needed',
        title: `Verify your identity (KYC ${required}) to continue`,
        body: `${action} needs KYC ${required}${current ? ` — your account is ${current === 'not verified' ? 'not verified yet' : `at ${current}`}` : ''}. We ask because the law requires it before money can move; your documents go to our verification provider, not to other players.`,
        stillWorks: [
          {
            title: 'Your balance stays safe',
            body: 'Available funds remain yours while you verify.',
          },
          {
            title: 'History, limits and settings',
            body: 'Everything in your account stays visible.',
          },
        ],
        paused: [{ title: action, body: `Available once KYC ${required} is approved.` }],
        actions: [
          { label: 'Verify identity', href: GATE_ROUTES.kyc, role: 'kyc' },
          { label: 'Why we ask (AML / KYC)', href: GATE_ROUTES.amlKyc, role: 'info' },
          SUPPORT,
        ],
        note: 'Level 1 is usually approved straight away; Level 2 and 3 are reviewed by a person, usually within 48 hours.',
      };
    }
    case 'self_excluded': {
      const until = ctx.endsAt ? utcDateTime(ctx.endsAt) : null;
      return {
        kind,
        tone: 'brand',
        overline: 'Self-exclusion',
        title: 'You’re self-excluded',
        body: `${until ? `Until ${until}` : 'Permanently'} you can’t play, enter Global Pool rounds or deposit. A self-exclusion can’t be shortened or undone early — not even by support — and nothing reopens automatically.`,
        stillWorks: [
          {
            title: 'Withdraw your balance at any time',
            body: 'We recommend taking it out now.',
          },
          {
            title: 'Download your history',
            body: 'Statements and transactions stay available.',
          },
          {
            title: 'Extend your self-exclusion',
            body: 'You can make it longer or permanent — never shorter.',
          },
        ],
        paused: [
          {
            title: 'Games, Global Pool and deposits',
            body: 'Entries bought before still settle; prizes go to Available.',
          },
          { title: 'All marketing', body: 'No emails, push messages or bonus offers.' },
        ],
        actions: [
          withdrawAction(ctx, 'Withdraw your balance'),
          { label: 'Talk to someone', href: GATE_ROUTES.support, role: 'support' },
          { label: 'Responsible gaming', href: GATE_ROUTES.responsibleGaming, role: 'rg' },
        ],
        note: 'Free, confidential help is available 24/7 — Gambling Therapy (gamblingtherapy.org), Gamblers Anonymous (gamblersanonymous.org), GamCare (gamcare.org.uk).',
      };
    }
    case 'cooling_off': {
      const until = ctx.endsAt ? utcDateTime(ctx.endsAt) : null;
      return {
        kind,
        tone: 'brand',
        overline: 'Cooling-off break',
        title: until ? `You’re on a break until ${until}` : 'You’re on a break',
        body: 'Games, Global Pool entries and deposits are paused until your break ends. A break can’t be shortened; when it ends, your limits stay exactly as they are.',
        stillWorks: [
          {
            title: 'Withdraw your balance',
            body: 'Withdrawals are never blocked by a break.',
          },
          {
            title: 'History and responsible-gaming tools',
            body: 'You can extend the break or self-exclude at any time.',
          },
        ],
        paused: [
          {
            title: 'Games, Global Pool entries and deposits',
            body: until ? `Back on ${until}.` : 'Back when your break ends.',
          },
        ],
        actions: [
          withdrawAction(ctx, 'Withdraw your balance'),
          { label: 'Responsible gaming', href: GATE_ROUTES.responsibleGaming, role: 'rg' },
          { label: 'Talk to someone', href: GATE_ROUTES.support, role: 'support' },
        ],
        note: null,
      };
    }
    case 'age':
      return {
        kind,
        tone: 'danger',
        overline: 'Age restriction',
        title: 'You must be 18+ to use GLOBAL POOL',
        body: 'Gambling is for adults only, so we can’t let you in. Thanks for being honest with us.',
        stillWorks: [
          {
            title: 'Talk to someone',
            body: 'If gambling is affecting you or someone close to you, free and confidential help is available.',
          },
        ],
        paused: [
          {
            title: 'Games, Global Pool, deposits and promotions',
            body: 'Only available to adults 18+ in permitted jurisdictions.',
          },
        ],
        actions: [
          { label: 'Leave GLOBAL POOL', href: LEAVE_URL, role: 'leave', external: true },
        ],
        note: 'Parents and carers: free blocking tools such as BetBlocker (betblocker.org) and the parental controls on your devices can keep gambling sites off shared phones and computers.',
      };
  }
}

/** Kind + context for an API error that is a regulatory block, else null (use in mutation `onError`). */
export function regulatoryFromError(
  err: unknown,
): { kind: RegulatoryKind; ctx: RegulatoryContext } | null {
  if (!(err instanceof ApiRequestError)) return null;
  const d = err.details ?? {};
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  switch (err.code) {
    case 'GEO_RESTRICTED':
      return { kind: 'region', ctx: { countryName: str(d.countryName) ?? str(d.country) } };
    case 'SELF_EXCLUDED':
      return {
        kind: d.kind === 'cooling_off' ? 'cooling_off' : 'self_excluded',
        ctx: { endsAt: str(d.endsAt) },
      };
    case 'KYC_REQUIRED':
      return {
        kind: 'kyc_required',
        ctx: { currentLevel: str(d.kycLevel), requiredLevel: str(d.requiredLevel) },
      };
    case 'REAL_MONEY_DISABLED':
      return { kind: 'licence', ctx: { product: 'Real-money play' } };
    default:
      return err.status === 451 ? { kind: 'region', ctx: {} } : null;
  }
}
