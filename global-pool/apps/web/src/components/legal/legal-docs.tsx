import {
  ENTRY_NETWORK_FEE,
  ENTRY_PRICE,
  MAX_ENTRIES_PER_PURCHASE,
  PLATFORM_FEE_PER_ENTRY,
  PLATFORM_WITHDRAWAL_FEE,
} from '@gp/shared/fees';
import {
  DAILY_WITHDRAWAL_LIMIT,
  MIN_AGE,
  MIN_DEPOSIT,
  MIN_WITHDRAWAL,
  NEW_ADDRESS_COOLDOWN_HOURS,
  RG_LIMIT_INCREASE_COOLDOWN_HOURS,
} from '@gp/shared/limits';
import { formatUSDT } from '@gp/shared/money';
import { PRIZES_PER_ROUND, ROUND_THRESHOLDS } from '@gp/shared/pool';
import Link from 'next/link';
import type * as React from 'react';

import type { InfoLink, InfoSection } from './info-page';

/**
 * DEMO summaries behind every legal link in the app (consent checkboxes, footer, KYC, licence card). They describe
 * how THIS testnet build behaves; they are not terms for real-money play, which is switched off server-side.
 */
export const LEGAL_DOC_KEYS = [
  'terms',
  'privacy',
  'aml',
  'aml-kyc',
  'restricted-countries',
  'licence',
  'fees',
  'cookies',
] as const;
export type LegalDocKey = (typeof LEGAL_DOC_KEYS)[number];

export interface LegalDoc {
  title: string;
  description: string;
  intro: React.ReactNode;
  sections: InfoSection[];
  related: InfoLink[];
}

export function isLegalDocKey(v: string): v is LegalDocKey {
  return (LEGAL_DOC_KEYS as readonly string[]).includes(v);
}

const DEMO_NOTE =
  'DEMO / testnet build: real-money play is disabled, balances are test USDT on Arbitrum Sepolia and nothing here is an offer to gamble with real money.';

const usdt = (v: string) => formatUSDT(v);

const AML: LegalDoc = {
  title: 'AML / KYC policy',
  description: 'How identity checks, withdrawal limits and anti-money-laundering reviews work.',
  intro: (
    <p>We verify who you are before you can withdraw and review unusual activity. {DEMO_NOTE}</p>
  ),
  sections: [
    {
      id: 'levels',
      title: 'Verification levels and daily withdrawal limits',
      body: (
        <ul>
          <li>
            Not verified: withdrawals {usdt(DAILY_WITHDRAWAL_LIMIT.none)} per day — verify first.
          </li>
          <li>Level 1 (identity details): up to {usdt(DAILY_WITHDRAWAL_LIMIT.level_1)} per day.</li>
          <li>
            Level 2 (ID document + liveness): up to {usdt(DAILY_WITHDRAWAL_LIMIT.level_2)} per day.
          </li>
          <li>Level 3 (enhanced review): up to {usdt(DAILY_WITHDRAWAL_LIMIT.level_3)} per day.</li>
        </ul>
      ),
    },
    {
      id: 'documents',
      title: 'What we keep from your documents',
      body: (
        <p>
          Document photos are hashed (SHA-256) in your browser; this build stores the hash and
          metadata (type, size, time), not the image. Personal details are shown masked to staff.
        </p>
      ),
    },
    {
      id: 'reviews',
      title: 'Withdrawal checks',
      body: (
        <ul>
          <li>Every withdrawal needs your authenticator code (step-up 2FA).</li>
          <li>
            New destination addresses wait {NEW_ADDRESS_COOLDOWN_HOURS} h before first use and can
            go to a routine AML review.
          </li>
          <li>
            Flagged withdrawals need two different staff members to approve (four-eyes); every
            decision is recorded in a tamper-evident audit log.
          </li>
          <li>Staff cannot change balances, edit ledger entries or pay out outside these flows.</li>
        </ul>
      ),
    },
  ],
  related: [
    { label: 'Verify your identity', href: '/account/kyc' },
    { label: 'Privacy policy', href: '/legal/privacy' },
    { label: 'Fees', href: '/legal/fees' },
  ],
};

const DOCS: Record<LegalDocKey, LegalDoc> = {
  terms: {
    title: 'Terms of service',
    description:
      'The rules of the GLOBAL POOL DEMO build: who can play, how entries, draws and withdrawals work.',
    intro: <p>These are the terms you accept when you create an account. {DEMO_NOTE}</p>,
    sections: [
      {
        id: 'eligibility',
        title: 'Who can use GLOBAL POOL',
        body: (
          <ul>
            <li>You must be {MIN_AGE} or older and use GLOBAL POOL from a permitted country.</li>
            <li>One account per person. Keep your sign-in and authenticator to yourself.</li>
            <li>
              Access from{' '}
              <Link href="/legal/restricted-countries" className="text-text-brand hover:underline">
                restricted countries
              </Link>{' '}
              is blocked; you can still sign in to withdraw.
            </li>
          </ul>
        ),
      },
      {
        id: 'entries',
        title: 'Global Pool entries',
        body: (
          <ul>
            <li>
              One entry costs {usdt(ENTRY_PRICE)} plus a platform fee of{' '}
              {usdt(PLATFORM_FEE_PER_ENTRY)} per qualifying entry (its own line, never added to the
              pool). Network fee for entries: {usdt(ENTRY_NETWORK_FEE)}. Up to{' '}
              {MAX_ENTRIES_PER_PURCHASE.toLocaleString('en-US')} entries per purchase.
            </li>
            <li>Entries are paid from your Available balance and are final once confirmed.</li>
            <li>
              A round draws only if it reaches {ROUND_THRESHOLDS.minParticipants} participants and{' '}
              {usdt(ROUND_THRESHOLDS.minPool)}; otherwise it is cancelled and every stake is
              refunded to Owed. {PRIZES_PER_ROUND} prizes are drawn per round with Chainlink VRF and
              can be verified by anyone.
            </li>
            <li>You can lose your stake. Only enter with money you can afford to lose.</li>
          </ul>
        ),
      },
      {
        id: 'games',
        title: 'Games',
        body: (
          <p>
            Originals and casino games in this build use DEMO credits with no cash value. They
            cannot be bought, withdrawn or exchanged.
          </p>
        ),
      },
      {
        id: 'money',
        title: 'Deposits and withdrawals',
        body: (
          <ul>
            <li>
              Deposits are credited after the required confirmations; minimum {usdt(MIN_DEPOSIT)}.
            </li>
            <li>
              Withdrawals need step-up 2FA and verified identity; minimum {usdt(MIN_WITHDRAWAL)}.
              GLOBAL POOL charges {usdt(PLATFORM_WITHDRAWAL_FEE)} — you pay the network fee shown
              before you confirm.
            </li>
            <li>Your own funds can always be withdrawn, also while you take a break.</li>
          </ul>
        ),
      },
      {
        id: 'rg',
        title: 'Responsible gaming',
        body: (
          <p>
            You can set deposit, participation, loss and time limits, take a break or self-exclude
            at any time. Lower limits apply at once; increases wait{' '}
            {RG_LIMIT_INCREASE_COOLDOWN_HOURS} h.
          </p>
        ),
      },
    ],
    related: [
      { label: 'Privacy policy', href: '/legal/privacy' },
      { label: 'Fees', href: '/legal/fees' },
      { label: 'Responsible gaming', href: '/responsible-gaming' },
      { label: 'Provably Fair', href: '/provably-fair' },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    description: 'Which personal data the GLOBAL POOL DEMO build processes, why, and your choices.',
    intro: <p>What we collect, why, and what you can ask us to do. {DEMO_NOTE}</p>,
    sections: [
      {
        id: 'collect',
        title: 'What we collect',
        body: (
          <ul>
            <li>
              Sign-in identifiers from Privy: email address, linked wallets, social sign-in id.
            </li>
            <li>Profile: handle, country, date of birth and the consents you gave (with time).</li>
            <li>Security: devices, sign-in history, IP-derived country, 2FA status.</li>
            <li>Identity checks: verification details and document hashes (not the images).</li>
            <li>Activity: deposits, withdrawals, entries and limits in an append-only ledger.</li>
          </ul>
        ),
      },
      {
        id: 'why',
        title: 'Why',
        body: (
          <p>
            To run your account, keep it secure, meet age, location and anti-money-laundering rules,
            apply your responsible-gaming limits and show you your own history. Marketing messages
            are sent only if you opted in, and you can opt out at any time.
          </p>
        ),
      },
      {
        id: 'rights',
        title: 'Your choices',
        body: (
          <p>
            You can see your data in your account, change notification preferences, and ask support
            for a copy, a correction or deletion. Records the law requires us to keep (ledger, AML)
            are kept even after an account is closed.
          </p>
        ),
      },
    ],
    related: [
      { label: 'Cookies and local storage', href: '/legal/cookies' },
      { label: 'Terms of service', href: '/legal/terms' },
      { label: 'Support', href: '/support' },
    ],
  },
  aml: AML,
  'aml-kyc': AML,
  'restricted-countries': {
    title: 'Restricted countries',
    description: 'Where GLOBAL POOL is not available, and what happens to your account there.',
    intro: (
      <p>
        Games, deposits and new Global Pool entries are blocked from restricted countries. The list
        is configured on the server and checked on every request. {DEMO_NOTE}
      </p>
    ),
    sections: [
      {
        id: 'default-list',
        title: 'Restricted in this build’s default configuration',
        body: (
          <ul>
            <li>United States</li>
            <li>Cuba</li>
            <li>Iran</li>
            <li>North Korea</li>
            <li>Syria</li>
          </ul>
        ),
      },
      {
        id: 'your-account',
        title: 'If you are in a restricted country',
        body: (
          <ul>
            <li>You can sign in, view your account and history, and withdraw your funds.</li>
            <li>Entries you already hold stay in their round and settle normally.</li>
            <li>
              Play and deposits switch back on when you use GLOBAL POOL from a permitted country.
            </li>
          </ul>
        ),
      },
    ],
    related: [
      { label: 'Terms of service', href: '/legal/terms' },
      { label: 'Support', href: '/support' },
    ],
  },
  licence: {
    title: 'Licence details',
    description: 'The licensing status of the GLOBAL POOL DEMO build.',
    intro: (
      <p>
        This DEMO build runs on testnets only and holds no gaming licence: real-money play is
        disabled on the server, and test USDT has no value. Before any real-money launch, Global
        Pool would be offered only where an applicable licence permits it.
      </p>
    ),
    sections: [
      {
        id: 'fairness',
        title: 'Fairness',
        body: (
          <p>
            Draws use Chainlink VRF v2.5 and are mirrored on Arbitrum Sepolia; anyone can re-derive
            the winners in the browser. No one at GLOBAL POOL can choose winners or edit results.
          </p>
        ),
      },
    ],
    related: [
      { label: 'Provably Fair', href: '/provably-fair' },
      { label: 'Restricted countries', href: '/legal/restricted-countries' },
      { label: 'Responsible gaming', href: '/responsible-gaming' },
    ],
  },
  fees: {
    title: 'Fees',
    description: 'Every fee GLOBAL POOL charges, each on its own line.',
    intro: (
      <p>No hidden fees: every fee is shown as its own line before you confirm. {DEMO_NOTE}</p>
    ),
    sections: [
      {
        id: 'entries',
        title: 'Global Pool entries',
        body: (
          <ul>
            <li>Entry price: {usdt(ENTRY_PRICE)} — all of it goes into the round’s pool.</li>
            <li>
              Platform fee: {usdt(PLATFORM_FEE_PER_ENTRY)} per qualifying entry — kept separately,
              never added to the pool, and not refunded if a round is cancelled (stakes are).
            </li>
            <li>
              Network fee: {usdt(ENTRY_NETWORK_FEE)} — entries are paid from your platform balance.
            </li>
          </ul>
        ),
      },
      {
        id: 'wallet',
        title: 'Deposits and withdrawals',
        body: (
          <ul>
            <li>Deposits: no GLOBAL POOL fee. Your wallet charges the sender’s network fee.</li>
            <li>
              Withdrawals: GLOBAL POOL fee {usdt(PLATFORM_WITHDRAWAL_FEE)}. The network fee is taken
              from the amount and shown, with what arrives, before you confirm.
            </li>
          </ul>
        ),
      },
      {
        id: 'games',
        title: 'Games',
        body: <p>Games use DEMO credits only: fees 0.00, no cash value.</p>,
      },
    ],
    related: [
      { label: 'Terms of service', href: '/legal/terms' },
      { label: 'Global Pool', href: '/pool' },
    ],
  },
  cookies: {
    title: 'Cookies and local storage',
    description: 'What GLOBAL POOL stores in your browser.',
    intro: (
      <p>
        This build uses only what it needs to work — no advertising or analytics cookies, so there
        is nothing to opt in to or out of. {DEMO_NOTE}
      </p>
    ),
    sections: [
      {
        id: 'essential',
        title: 'Essential storage',
        body: (
          <ul>
            <li>Sign-in session from our sign-in provider (Privy) — keeps you signed in.</li>
            <li>Sidebar layout preference and dismissed notices — remembered on this device.</li>
            <li>An unsent withdrawal draft — kept in this tab only, cleared when you finish.</li>
          </ul>
        ),
      },
    ],
    related: [{ label: 'Privacy policy', href: '/legal/privacy' }],
  },
};

export function legalDoc(key: LegalDocKey): LegalDoc {
  return DOCS[key];
}
