import { MIN_WITHDRAWAL } from '@gp/shared/limits';
import { formatUSDT } from '@gp/shared/money';
import Link from 'next/link';

import { Card } from '@/components/ui/card';

import { InfoPage, type InfoSection } from './info-page';

const linkCls = 'text-text-brand hover:underline';

/** Independent help organisations (real resources, same list as the footer). */
const HELP_ORGS = [
  { label: 'GamCare', href: 'https://www.gamcare.org.uk' },
  { label: 'Gamblers Anonymous', href: 'https://www.gamblersanonymous.org' },
  { label: 'BeGambleAware', href: 'https://www.begambleaware.org' },
];

const SUPPORT_SECTIONS: InfoSection[] = [
  {
    id: 'deposits',
    title: 'A deposit is late or failed',
    body: (
      <>
        <p>
          Deposits are credited automatically once they reach the confirmations shown on the
          deposit. Track every deposit and its reference (DP-…) in{' '}
          <Link href="/wallet/history?type=deposit" className={linkCls}>
            Wallet → History
          </Link>
          . Tokens sent on another network or to an old address are not credited automatically.
        </p>
      </>
    ),
  },
  {
    id: 'withdrawals',
    title: 'A withdrawal is pending',
    body: (
      <p>
        The{' '}
        <Link href="/wallet/history?type=withdrawal" className={linkCls}>
          withdrawal tracker
        </Link>{' '}
        shows each step (security checks, review, broadcast) and lets you cancel until the
        transaction is broadcast. Minimum withdrawal {formatUSDT(MIN_WITHDRAWAL)}; identity
        verification is needed first.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Account and security',
    body: (
      <p>
        If you think someone else used your account, end other sessions in{' '}
        <Link href="/account/sessions" className={linkCls}>
          Sessions
        </Link>
        , check{' '}
        <Link href="/account/devices" className={linkCls}>
          Devices
        </Link>{' '}
        and reset two-step sign-in in{' '}
        <Link href="/account/2fa" className={linkCls}>
          2FA settings
        </Link>
        . GLOBAL POOL never asks for your codes or wallet keys.
      </p>
    ),
  },
  {
    id: 'rg',
    title: 'Responsible gaming',
    body: (
      <>
        <p>
          Set limits, take a break or self-exclude in{' '}
          <Link href="/responsible-gaming" className={linkCls}>
            Responsible gaming
          </Link>{' '}
          — it works at once, without contacting anyone. Free, independent help:
        </p>
        <ul>
          {HELP_ORGS.map((o) => (
            <li key={o.href}>
              <a href={o.href} target="_blank" rel="noreferrer" className={linkCls}>
                {o.label}
              </a>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Email <span className="text-text-primary">support@globalpool.example</span> with the
        reference shown on the screen (DP-…, WD-…, EP-…). DEMO build: this is a placeholder address
        and there is no live chat or ticket desk yet, so messages are not answered.
      </p>
    ),
  },
];

export function SupportPage() {
  return (
    <InfoPage
      crumb={{ label: 'Support' }}
      title="Support"
      intro={
        <p>
          Most questions are answered by your own account pages — every deposit, withdrawal and
          entry has a reference and a status you can check at any time.
        </p>
      }
      sections={SUPPORT_SECTIONS}
      related={[
        { label: 'Fees', href: '/legal/fees' },
        { label: 'Terms of service', href: '/legal/terms' },
        { label: 'Restricted countries', href: '/legal/restricted-countries' },
      ]}
    />
  );
}

export function PromotionsPage() {
  return (
    <InfoPage
      crumb={{ label: 'Promotions' }}
      title="Promotions"
      intro={
        <p>
          Offer terms in full. DEMO build: promotions are shown for review only — no bonus funds are
          credited, the deposit flow has no opt-in yet, and nothing is ever added to your account
          automatically.
        </p>
      }
    >
      <Card variant="gold" padding="l" className="gap-3" id="welcome-offer">
        <h2 className="text-h4">Welcome offer · 100% up to 500 USDT</h2>
        <ul className="flex flex-col gap-1.5 text-body-s text-text-secondary [&_li]:ml-4 [&_li]:list-disc">
          <li>100% match on your first deposit, up to 500.00 USDT in bonus funds.</li>
          <li>Minimum deposit 20.00 USDT. Opt-in only — never pre-selected.</li>
          <li>30× wagering on bonus funds, to complete within 14 days.</li>
          <li>Maximum bet while bonus funds are active: 5.00 USDT.</li>
          <li>Wagering contribution: Originals and slots 100%, table games 10%, Global Pool 0%.</li>
          <li>Withdrawing early forfeits the bonus — never your own deposit.</li>
          <li>18+. You can lose your stake.</li>
        </ul>
      </Card>
      <Card padding="l" className="gap-2" id="other-promotions">
        <h2 className="text-h5">Other promotions</h2>
        <p className="text-body-s text-text-secondary">
          Daily rewards, the weekly tournament, rakeback and cashback shown in the lobby are DEMO
          previews and are not active in this build.
        </p>
        <p className="text-body-s">
          <Link href="/responsible-gaming" className={linkCls}>
            Responsible gaming
          </Link>
        </p>
      </Card>
    </InfoPage>
  );
}
